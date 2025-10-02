import {
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    AudioPlayer,
    AudioPlayerPlayingState
} from "@discordjs/voice";
import {
    VoiceChannel,
    TypedEmitter,
    MusicPlayerEvent,
    TrackMetadata,
    MusicPlayerOptions,
    SearchPlatform,
    TextChannel
} from "./types";
import { htmlToText } from "html-to-text";
import { Manager, Player } from "erela.js";
import { TrackInfo } from "soundcloud-downloader/src/info";
import type { Stream } from "stream";
import EventEmitter from "events";
import playdl, { DeezerTrack, InfoData, SpotifyTrack, YouTubeVideo } from "play-dl";
import scdl from "soundcloud-downloader";

// Custom error class for detailed console output
class MusicPlayerError extends Error {
    constructor(message: string, public type: string = "DiscordPlayerError") {
        super(message);
        this.name = "DiscordPlayerError";
    }

    // Formatted console output
    toString(): string {
        return `
\x1b[31m[${this.type}] ${this.message}\x1b[0m
\x1b[90mStack: ${this.stack || "No stack trace available"}\x1b[0m
`;
    }
}

// Simple in-memory cache for metadata
const metadataCache = new Map<string, TrackMetadata[]>();

export class MusicPlayer extends EventEmitter<TypedEmitter> {
    private previousQueueOrder: TrackMetadata[] = [];
    public manager?: Manager;
    public player?: Player | AudioPlayer;
    private volume: number;
    private queue: TrackMetadata[] = [];
    private history: TrackMetadata[] = [];
    private loopQueue = false;
    private loopTrack = false;
    private playing = false;
    private autoLeaveOnEmptyQueue: boolean;
    private autoLeaveOnIdleMs: number;
    private idleTimer: NodeJS.Timeout | null = null;
    private shuffield = false;
    private useLavalink: boolean;
    private radioMode = false;
    private radioUrls: string[] = [];

    private connectionData: {
        channelId: string;
        guildId: string;
        adapterCreator: any;
        selfDeaf?: boolean;
        selfMute?: boolean;
        group?: string;
        debug?: boolean;
    } | null = null;

    constructor(
        public channel: VoiceChannel,
        public textChannel: TextChannel,
        lavaLinkManager?: Manager,
        options: MusicPlayerOptions = {}
    ) {
        super();

        this.useLavalink = !!lavaLinkManager;
        this.manager = lavaLinkManager;
        this.volume = Math.min(Math.max((options.initialVolume ?? 100), 0), 200);
        this.autoLeaveOnEmptyQueue = options.autoLeaveOnEmptyQueue ?? true;
        this.autoLeaveOnIdleMs = options.autoLeaveOnIdleMs ?? 5 * 60_000;

        this.connectionData = {
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
            debug: false
        };

        if (this.useLavalink && this.manager) {
            this.player = this.manager.create({
                guild: this.connectionData.guildId,
                voiceChannel: this.connectionData.channelId,
                textChannel: this.textChannel.id,
                selfDeafen: true,
                selfMute: false,
                volume: this.volume
            });

            this.manager.on("trackStart", async (player, track) => {
                this.playing = true;
                this.clearIdleTimer();
                const metadata = await this.extractMetadata(track.uri);
                this.emit(MusicPlayerEvent.Start, { metadata, queue: await this.getQueue() });
            });

            this.manager.on("trackEnd", () => this.onIdle());
            this.manager.on("queueEnd", () => {
                this.playing = false;
                this.onIdle();
            });

            this.manager.on("trackError", (player, track, error) => {
                const err = new MusicPlayerError(`Track error: ${error.error}`, "TrackError");
                console.error(err.toString());
                this.emit(MusicPlayerEvent.Error, err);
                this.skip();
            });

            this.manager.on("trackStuck", (player, track, threshold) => {
                const err = new MusicPlayerError(`Track stuck for ${threshold.thresholdMs}ms`, "TrackStuck");
                console.error(err.toString());
                this.emit(MusicPlayerEvent.Error, err);
                this.skip();
            });

            this.manager.on("socketClosed", (player, payload) => {
                const err = new MusicPlayerError(`Socket closed: ${payload.reason}`, "SocketError");
                console.error(err.toString());
                this.emit(MusicPlayerEvent.Error, err);
            });
        }

        else {
            this.player = createAudioPlayer();
            this.player.on("error", err => {
                const customErr = new MusicPlayerError(`Player error: ${err.message}`, "PlayerError");
                console.error(customErr.toString());
                this.emit(MusicPlayerEvent.Error, customErr);
            });
            this.player.on(AudioPlayerStatus.Idle, () => this.onIdle());
            this.player.on(AudioPlayerStatus.Playing, () => this.clearIdleTimer());

            if (options.youtubeCookie) {
                playdl.setToken({ youtube: { cookie: options.youtubeCookie } });
            }
        }
    }

    public join(): VoiceConnection {
        if (!this.connectionData) {
            const err = new MusicPlayerError("No connection data available.", "ConnectionError");
            console.error(err.toString());

            throw err;
        }

        const connection = joinVoiceChannel(this.connectionData);
        try {
            entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        }

        catch (e: any) {
            connection.destroy();
            const err = new MusicPlayerError(`Can't connect to voice channel: ${e.message}`, "ConnectionError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);
            throw err;
        }

        if (!this.useLavalink) {
            connection.subscribe(this.player as AudioPlayer);
        }

        return connection;
    }

    public setData(data: {
        channelId: string;
        guildId: string;
        adapterCreator: any;
        selfDeaf?: boolean;
        selfMute?: boolean;
        group?: string;
        debug?: boolean;
    }) {
        this.connectionData = {
            ...data,
            selfDeaf: data.selfDeaf ?? true,
            selfMute: data.selfMute ?? false,
            debug: data.debug ?? false
        };

        if (this.useLavalink && this.manager) {
            (this.player as Player).voiceChannel = data.channelId;
            (this.player as Player).guild = data.guildId;
        }

        return this;
    }

    private async ensureConnection() {
        if (this.useLavalink && this.manager) {
            if ((this.player as Player).state !== "CONNECTED") {
                (this.player as Player).connect();
            }
        }

        else {
            this.join();
        }
    }

    private startIdleTimer() {
        if (this.autoLeaveOnIdleMs > 0 && !this.idleTimer && !this.playing) {
            this.idleTimer = setTimeout(() => {
                this.emit(MusicPlayerEvent.Disconnect);
                this.disconnect();
            }, this.autoLeaveOnIdleMs);
        }
    }

    private clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    public async searchLyrics(title: string, artist?: string): Promise<string | null> {
        const query = encodeURIComponent(`${artist ? artist + " " : ""}${title} lyrics`);
        const attempts = [
            `https://www.google.com/search?q=${query}`,
            `https://www.google.com/search?q=${query}+song+lyrics`
        ];

        for (const url of attempts) {
            try {
                const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
                const html = await res.text();
                const delim1 = '</div></div></div></div><div class="hwc"><div class="BNeawe tAd8D AP7Wnd"><div><div class="BNeawe tAd8D AP7Wnd">';
                const delim2 = '</div></div></div></div></div><div><span class="hwc"><div class="BNeawe uEec3 AP7Wnd">';
                let snippet = html.split(delim1)[1]?.split(delim2)[0];
                if (!snippet) continue;

                const lyrics = snippet.split("\n").map(line => htmlToText(line).trim()).join("\n").trim();
                return lyrics || null;
            } catch (e) {
                console.error(new MusicPlayerError(`Lyrics fetch failed for ${url}: ${e}`, "LyricsError").toString());
                continue;
            }
        }
        return null;
    }

    public async search(query: string, platform?: SearchPlatform, limit = 1): Promise<TrackMetadata[]> {
        if (limit < 1) {
            const err = new MusicPlayerError("Search limit must be at least 1.", "SearchError");
            console.error(err.toString());
            throw err;
        }

        await this.ensureConnection();

        const cacheKey = `${platform || "all"}:${query}:${limit}`;
        if (metadataCache.has(cacheKey)) {
            return metadataCache.get(cacheKey)!.slice(0, limit);
        }

        if (/^https?:\/\//.test(query) && !this.isPlatformUrl(query)) {
            const metadata: TrackMetadata = {
                title: "Direct Stream",
                author: undefined,
                duration: undefined,
                thumbnail: undefined,
                source: "unknown",
                url: query
            };

            metadataCache.set(cacheKey, [metadata]);

            return [metadata];
        }

        // Prioritize platform based on URL if provided
        const platforms = this.determinePlatforms(query, platform);

        for (const plat of platforms) {
            const results = await this.searchOnPlatform(query, plat as SearchPlatform, limit);
            if (results.length > 0) {
                metadataCache.set(cacheKey, results);

                return results.slice(0, limit);
            }
        }

        const err = new MusicPlayerError(`No results found for query: ${query}`, "SearchError");
        console.error(err.toString());

        return [];
    }

    private determinePlatforms(query: string, platform?: SearchPlatform): SearchPlatform[] {
        if (platform) return [platform];

        // If query is a URL, prioritize the matching platform
        if (this.isPlatformUrl(query)) {
            if (/(youtube\.com|youtu\.be)/.test(query))
                return ["youtube", "spotify", "soundcloud", "deezer"];

            if (/spotify\.com/.test(query))
                return ["spotify", "youtube", "soundcloud", "deezer"];

            if (/(soundcloud\.com|snd\.sc)/.test(query))
                return ["soundcloud", "youtube", "spotify", "deezer"];

            if (/deezer\.com/.test(query))
                return ["deezer", "youtube", "spotify", "soundcloud"];
        }

        return this.useLavalink
            ? ["youtube", "spotify", "soundcloud", "deezer"]
            : ["spotify", "soundcloud", "youtube", "deezer"];
    }

    private async searchOnPlatform(query: string, platform: SearchPlatform, limit: number): Promise<TrackMetadata[]> {
        const retry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await fn();
                }

                catch (err: any) {
                    if (err.message.includes("429") && i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                        continue;
                    }
                    const customErr = new MusicPlayerError(`Search failed on ${platform}: ${err.message}`, "SearchError");
                    console.error(customErr.toString());
                    throw customErr;
                }
            }

            const err = new MusicPlayerError("Max retries reached for search.", "SearchError");
            console.error(err.toString());

            throw err;
        };

        if (this.useLavalink && this.manager) {
            try {
                const res = await retry(() => (this.player as Player).search(
                    `${platform === "youtube" ? "ytsearch" : platform === "soundcloud" ? "scsearch" : platform}:${query}`,
                    undefined
                ));

                if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") {
                    return [];
                }

                const tracks: TrackMetadata[] = [];
                for (const track of res.tracks.slice(0, limit)) {
                    const metadata = await this.extractMetadata(track.uri);
                    tracks.push(metadata);
                    metadataCache.set(track.uri, [metadata]);
                }

                return tracks;
            }

            catch (err) {
                console.error(new MusicPlayerError(`Lavalink search error on ${platform}: ${err}`, "SearchError").toString());
                return [];
            }
        }

        else {
            try {
                if (platform === "youtube") {
                    const results = await retry(() => playdl.search(query, { limit, source: { youtube: "video" } }));

                    return results.map(r => ({
                        title: r.title,
                        author: r.channel?.name,
                        duration: r.durationInSec,
                        thumbnail: r.thumbnails[0]?.url,
                        source: "youtube",
                        url: r.url
                    }));
                }

                else if (platform === "spotify") {
                    const results = await retry(() => playdl.search(query, { limit, source: { spotify: "track" } }));

                    return results.map(r => ({
                        title: r.name,
                        author: r.artists[0]?.name,
                        duration: r.durationInSec,
                        thumbnail: r.thumbnail?.url,
                        source: "spotify",
                        url: r.url
                    }));
                }

                else if (platform === "soundcloud") {
                    const results = await retry(() => scdl.search({ query, resourceType: "tracks", limit }));

                    return (results.collection as TrackInfo[]).map((r) => ({
                        title: r.title!,
                        author: r.user?.full_name!,
                        duration: Math.floor(r.full_duration! / 1000),
                        thumbnail: r.artwork_url || r.user?.avatar_url,
                        source: "soundcloud",
                        url: r.uri!
                    }));
                }

                else if (platform === "deezer") {
                    const results = await retry(() => playdl.search(query, { limit, source: { deezer: "track" } }));

                    return results.map(r => ({
                        title: r.title,
                        author: r.artist?.name,
                        duration: r.durationInSec,
                        thumbnail: r.artist?.picture?.medium,
                        source: "deezer",
                        url: r.url
                    }));
                }
            }

            catch (err) {
                console.error(new MusicPlayerError(`Search error on ${platform}: ${err}`, "SearchError").toString());
                return [];
            }
        }
        return [];
    }

    private isPlatformUrl(url: string): boolean {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|spotify\.com|soundcloud\.com|deezer\.com)\//.test(url);
    }

    public async startRadio(urls: string[]) {
        this.radioMode = true;
        this.radioUrls = urls;
        const shuffledUrls = this.shuffleArray(urls);
        for (const url of shuffledUrls) {
            await this.play(url, true);
        }
        this.loopQueue = true;
    }

    private detectSource(link: string): TrackMetadata["source"] {
        if (!link)
            return "unknown";

        if (/(youtube\.com|youtu\.be)/.test(link))
            return "youtube";

        if (/spotify\.com/.test(link))
            return "spotify";

        if (/(soundcloud\.com|snd\.sc)/.test(link))
            return "soundcloud";

        if (/deezer\.com/.test(link))
            return "deezer";

        return "unknown";
    }

    private async extractMetadata(track: string): Promise<TrackMetadata> {
        if (metadataCache.has(track)) {
            return metadataCache.get(track)![0];
        }

        const emptyResult: TrackMetadata = {
            title: undefined,
            author: undefined,
            duration: undefined,
            thumbnail: undefined,
            source: this.detectSource(track),
            url: track
        };

        try {
            if (this.useLavalink && this.manager) {
                const lvTrack = (await this.manager.search(track)).tracks[0];
                if (!lvTrack) return emptyResult;

                const metadata = {
                    title: lvTrack.title,
                    author: lvTrack.author,
                    duration: lvTrack.isStream ? undefined : Math.floor(lvTrack.duration / 1000),
                    thumbnail: lvTrack.thumbnail || undefined,
                    source: this.detectSource(lvTrack.uri),
                    url: lvTrack.uri
                };

                metadataCache.set(track, [metadata]);

                return metadata;
            }

            if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(track)) {
                const info = await playdl.video_info(track).catch(() => null);
                if (!info) return emptyResult;

                const details = info.video_details;
                const metadata: TrackMetadata = {
                    title: details.title,
                    author: details.channel?.name,
                    duration: details.durationInSec,
                    thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url,
                    source: "youtube",
                    url: details.url
                };

                metadataCache.set(track, [metadata]);

                return metadata;
            }

            if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(track)) {
                const info = await scdl.getInfo(track).catch(() => null);
                if (!info) return emptyResult;

                const metadata: TrackMetadata = {
                    title: info.title,
                    author: info.user?.username,
                    duration: Math.floor(info.duration! / 1000),
                    thumbnail: info.artwork_url || info.user?.avatar_url,
                    source: "soundcloud",
                    url: info.uri!
                };

                metadataCache.set(track, [metadata]);

                return metadata;
            }

            const result = await playdl.video_basic_info(track).catch(() => null);
            if (!result)
                return emptyResult;

            const vid = result.video_details;
            const metadata = {
                title: vid.title,
                author: vid.channel?.name,
                duration: vid.durationInSec,
                thumbnail: vid.thumbnails?.[0]?.url,
                source: this.detectSource(track),
                url: vid.url
            };

            metadataCache.set(track, [metadata]);

            return metadata;
        }

        catch (e) {
            const err = new MusicPlayerError(`Failed to extract metadata for ${track}: ${e}`, "MetadataError");
            console.error(err.toString());

            return emptyResult;
        }
    }

    public async play(input: string | TrackMetadata | TrackMetadata[], radio = false) {
        await this.ensureConnection();

        let tracks: TrackMetadata[] = [];
        if (typeof input === "string") {
            if (this.isPlatformUrl(input)) {
                tracks = [await this.extractMetadata(input)];
            }

            else {
                const results = await this.search(input, undefined, 1); // Limit to 1 for single track
                if (results.length === 0) {
                    const err = new MusicPlayerError(`No results for: ${input}`, "PlayError");
                    console.error(err.toString());
                    this.emit(MusicPlayerEvent.Error, err);

                    return;
                }

                tracks = [results[0]]; // Only first result
            }
        }

        else if (Array.isArray(input)) {
            tracks = input; // Playlists or arrays
        }

        else {
            tracks = [input];
        }

        for (const track of tracks) {
            if (this.useLavalink && this.manager) {
                try {
                    const res = await (this.player as Player).search(track.url);
                    if (res.loadType === "PLAYLIST_LOADED") {
                        res.tracks.forEach(t => (this.player as Player).queue.add(t));
                        this.emit(MusicPlayerEvent.QueueAdd, {
                            metadatas: res.tracks.map(t => ({
                                title: t.title,
                                author: t.author,
                                duration: t.isStream ? undefined : Math.floor(t.duration / 1000),
                                thumbnail: t.thumbnail,
                                source: this.detectSource(t.uri),
                                url: t.uri
                            })) as TrackMetadata[],
                            queue: await this.getQueue()
                        });
                    }

                    else if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
                        (this.player as Player).queue.add(res.tracks[0]);
                        this.queue.push(track);
                        this.emit(MusicPlayerEvent.QueueAdd, { metadata: track, queue: await this.getQueue() });
                    }

                    else {
                        const err = new MusicPlayerError(`Failed to load: ${track.url}`, "PlayError");
                        console.error(err.toString());
                        this.emit(MusicPlayerEvent.Error, err);

                        continue;
                    }
                }

                catch (e) {
                    const err = new MusicPlayerError(`Failed to load: ${track.url}: ${e}`, "PlayError");
                    console.error(err.toString());
                    this.emit(MusicPlayerEvent.Error, err);

                    continue;
                }
            }

            else {
                const stream = await this.createStream(track.url);
                if (!stream) {
                    const err = new MusicPlayerError(`Failed to create stream for ${track.url}`, "StreamError");
                    console.error(err.toString());
                    this.emit(MusicPlayerEvent.Error, err);

                    continue;
                }

                const resource = createAudioResource(stream, { inlineVolume: true });
                resource.volume?.setVolume(this.volume / 100);
                (this.player as AudioPlayer).play(resource);
                this.queue.push(track);
                this.emit(MusicPlayerEvent.QueueAdd, { metadata: track, queue: this.queue });
            }

            this.history.push(track);
        }

        if (!this.playing && !radio) {
            if (this.useLavalink && this.manager) {
                (this.player as Player).play();
            }
        }
    }

    private async createStream(url: string): Promise<Stream.Readable | null> {
        const retry = async <T>(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<T | null> => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await fn();
                }

                catch (err: any) {
                    if (err.message.includes("429") && i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                        continue;
                    }

                    const customErr = new MusicPlayerError(`Stream error for ${url}: ${err.message}`, "StreamError");
                    console.error(customErr.toString());

                    return null;
                }
            }

            const err = new MusicPlayerError(`Max retries reached for stream: ${url}`, "StreamError");
            console.error(err.toString());

            return null;
        };

        if (playdl.yt_validate(url) === "video") {
            return await retry<Stream.Readable>(() => playdl.stream(url, { quality: 2 }).then(s => s.stream));
        }

        if (playdl.sp_validate(url) === "track") {
            const sp_info = await playdl.spotify(url).catch(() => null) as SpotifyTrack;
            if (!sp_info) {
                const err = new MusicPlayerError(`Failed to fetch Spotify info for ${url}`, "StreamError");
                console.error(err.toString());

                return null;
            }

            const search = await retry<YouTubeVideo[]>(() => playdl.search(`${sp_info.name} ${sp_info.artists[0]?.name || ""}`, { limit: 1 }));

            if (search && search.length > 0) {
                return await retry(() => playdl.stream(search[0].url, { quality: 2 }).then(s => s.stream));
            }
        }

        if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url)) {
            return await retry(() => scdl.download(url));
        }

        if (await playdl.dz_validate(url) === "track") {
            const dz_info = await playdl.deezer(url).catch(() => null) as DeezerTrack;
            if (!dz_info) {
                const err = new MusicPlayerError(`Failed to fetch Deezer info for ${url}`, "StreamError");
                console.error(err.toString());

                return null;
            }

            const search = await retry<YouTubeVideo[]>(() => playdl.search(`${dz_info.title} ${dz_info.artist?.name || ""}`, { limit: 1 }));
            if (search && search.length > 0) {
                return await retry(() => playdl.stream(search[0].url, { quality: 2 }).then(s => s.stream));
            }
        }

        return url as any; // Direct stream
    }

    public pause() {
        if (this.useLavalink && this.manager) {
            (this.player as Player).pause(true);
        }

        else {
            (this.player as AudioPlayer).pause();
        }

        this.emit(MusicPlayerEvent.Pause);
    }

    public resume() {
        if (this.useLavalink && this.manager) {
            (this.player as Player).pause(false);
        }

        else {
            (this.player as AudioPlayer).unpause();
        }

        this.emit(MusicPlayerEvent.Resume);
    }

    public setVolume(percent: number): number {
        this.volume = Math.min(Math.max(percent, 0), 200);
        if (this.useLavalink && this.manager) {
            (this.player as Player).setVolume(this.volume);
        }

        else {
            const resource = ((this.player as AudioPlayer).state as AudioPlayerPlayingState)?.resource;
            resource?.volume?.setVolume(this.volume / 100);
        }

        this.emit(MusicPlayerEvent.VolumeChange, { volume: this.volume });

        return this.volume;
    }

    private async onIdle() {
        this.playing = false;

        if (this.loopTrack) {
            const last = this.history[this.history.length - 1];
            if (last) {
                await this.play(last);
                return;
            }
        }

        if (this.useLavalink && this.manager) {
            if (this.loopQueue && (this.player as Player).queue.size === 0 && (this.player as Player).queue.previous) {
                (this.player as Player).queue.add((this.player as Player).queue.previous!);
                (this.player as Player).play();

                return;
            }
        }

        else {
            if (this.loopQueue && this.queue.length === 0 && this.history.length > 0) {
                await this.play(this.history[this.history.length - 1]);

                return;
            }
        }

        if (this.radioMode && this.radioUrls.length > 0 && (await this.getQueue()).length === 0) {
            const shuffledUrls = this.shuffleArray([...this.radioUrls]);
            for (const url of shuffledUrls) {
                await this.play(url, true);
            }

            return;
        }

        this.emit(MusicPlayerEvent.Finish, { queue: await this.getQueue(), history: this.history.map(h => h.url) });
        if (this.autoLeaveOnEmptyQueue) {
            this.emit(MusicPlayerEvent.Disconnect);
            this.disconnect();
        }

        else {
            this.startIdleTimer();
        }
    }

    public async skip() {
        const current = this.useLavalink ? (this.player as Player).queue.current?.uri : this.history[this.history.length - 1]?.url;
        if (current) {
            this.history.push({ url: current } as TrackMetadata);
        }

        this.emit(MusicPlayerEvent.Skip, { queue: await this.getQueue(), history: this.history.map(h => h.url) });
        if (this.useLavalink && this.manager) {
            (this.player as Player).stop();
        }

        else {
            (this.player as AudioPlayer).stop();
            this.queue.shift();
        }
    }

    public async previous() {
        if (this.history.length < 1) {
            const err = new MusicPlayerError("No previous track.", "PreviousError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return;
        }

        const prev = this.history.pop()!;
        await this.play(prev);
        this.emit(MusicPlayerEvent.Previous, { metadata: prev, queue: await this.getQueue(), history: this.history.map(h => h.url) });
    }

    public async shuffle() {
        this.previousQueueOrder = [...this.queue];
        if (this.useLavalink && this.manager) {
            (this.player as Player).queue.shuffle();
        }

        else {
            this.queue = this.shuffleArray(this.queue);
        }

        this.shuffield = true;
        this.emit(MusicPlayerEvent.Shuffle, { queue: await this.getQueue() });
    }

    public async undoShuffle() {
        if (this.useLavalink && this.manager) {
            (this.player as Player).queue.clear();
            for (const meta of this.previousQueueOrder) {
                const res = await (this.player as Player).search(meta.url);
                if (res.tracks[0])
                    (this.player as Player).queue.add(res.tracks[0]);
            }
        }

        else {
            this.queue = [...this.previousQueueOrder];
        }

        this.shuffield = false;
        this.emit(MusicPlayerEvent.Shuffle, { queue: await this.getQueue() });
    }

    public toggleLoopQueue(): boolean {
        this.loopQueue = !this.loopQueue;
        if (this.loopQueue)
            this.loopTrack = false;

        this.emit(MusicPlayerEvent.LoopQueue, { enabled: this.loopQueue });

        return this.loopQueue;
    }

    public isLoopQueue(): boolean {
        return this.loopQueue;
    }

    public toggleLoopTrack(): boolean {
        this.loopTrack = !this.loopTrack;
        if (this.loopTrack)
            this.loopQueue = false;

        this.emit(MusicPlayerEvent.LoopTrack, { enabled: this.loopTrack });

        return this.loopTrack;
    }

    public isLoopTrack(): boolean {
        return this.loopTrack;
    }

    public disconnect() {
        this.clearIdleTimer();
        if (this.useLavalink && this.manager) {
            (this.player as Player).destroy();
        }

        else {
            (this.player as AudioPlayer).stop();
        }

        this.playing = false;
        this.queue = [];
        this.history = [];
        this.radioMode = false;
        this.radioUrls = [];
        this.emit(MusicPlayerEvent.Disconnect);
    }

    public stop(noLeave = true) {
        if (this.useLavalink && this.manager) {
            (this.player as Player).stop();
            (this.player as Player).queue.clear();
        }

        else {
            (this.player as AudioPlayer).stop();
            this.queue = [];
        }

        this.playing = false;
        this.history = [];
        this.radioMode = false;
        this.radioUrls = [];
        this.clearIdleTimer();
        if (!noLeave)
            this.disconnect();

        this.emit(MusicPlayerEvent.Stop);
    }

    public async getQueue(): Promise<TrackMetadata[]> {
        if (this.useLavalink && this.manager) {
            const queue = (this.player as Player).queue;
            const tracks: TrackMetadata[] = [];
            for (const track of queue) {
                tracks.push(await this.extractMetadata(track.uri!));
            }

            return tracks;
        }

        return [...this.queue];
    }

    public getVolume(): number {
        return this.volume;
    }

    public isPlaying(): boolean {
        return this.playing;
    }

    public isPaused(): boolean {
        if (this.useLavalink && this.manager) {
            return (this.player as Player).paused;
        }

        return (this.player as AudioPlayer).state.status === AudioPlayerStatus.Paused;
    }

    public isShuffiled(): boolean {
        return this.shuffield;
    }

    public isConnected(guildId?: string): boolean {
        if (this.useLavalink && this.manager) {
            return (this.player as Player).node?.connected || false;
        }

        return (this.player as AudioPlayer).state.status !== AudioPlayerStatus.Idle;
    }
}
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */