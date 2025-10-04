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
    TextChannel,
    PlaylistMetadata,
    Source,
    LavalinkManagerType
} from "./types";
import {
    DeezerPlaylist,
    DeezerTrack,
    SpotifyPlaylist,
    SpotifyTrack,
    YouTubePlayList,
    YouTubeVideo
} from "play-dl";
import { htmlToText } from "html-to-text";
import { TrackInfo } from "soundcloud-downloader/src/info";
import { Player, Track } from "erela.js";
import EventEmitter from "events";
import Stream from "stream";
import playdl from "play-dl";
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
    private manager?: LavalinkManagerType;
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
        private options: MusicPlayerOptions = {}
    ) {
        super();

        this.useLavalink = !!this.options.lavaLinkManager;
        this.manager = this.options.lavaLinkManager;
        this.volume = Math.min(Math.max((this.options.initialVolume ?? 100), 0), 200);
        this.autoLeaveOnEmptyQueue = this.options.autoLeaveOnEmptyQueue ?? true;
        this.autoLeaveOnIdleMs = this.options.autoLeaveOnIdleMs ?? 5 * 60_000;

        this.connectionData = {
            channelId: this.channel.id,
            guildId: this.channel.guild.id,
            adapterCreator: this.channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
            debug: false
        };

        if (this.options.token) {
            void playdl.setToken(this.options.token as any);
        }

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
                const queue = await this.getQueue();
                this.emit(MusicPlayerEvent.Start, { metadata, queue });
            });

            this.manager.on("trackEnd", () => this.onIdle());
            this.manager.on("queueEnd", () => {
                this.playing = false;
                this.onIdle();
            });

            this.manager.on("trackError", (player, track, error) => {
                const err = new MusicPlayerError(`Track error: ${error.error}`, "TrackError");
                if (options.logError)
                    console.error(err.toString());

                this.emit(MusicPlayerEvent.Error, err);
                this.skip();
            });

            this.manager.on("trackStuck", (player, track, threshold) => {
                const err = new MusicPlayerError(`Track stuck for ${threshold.thresholdMs}ms`, "TrackStuck");
                if (options.logError)
                    console.error(err.toString());

                this.emit(MusicPlayerEvent.Error, err);
                this.skip();
            });

            this.manager.on("socketClosed", (player, payload) => {
                const err = new MusicPlayerError(`Socket closed: ${payload.reason}`, "SocketError");
                if (options.logError)
                    console.error(err.toString());

                this.emit(MusicPlayerEvent.Error, err);
            });
        }

        else {
            this.player = createAudioPlayer();
            this.player.on("error", err => {
                const customErr = new MusicPlayerError(`Player error: ${err.message}`, "PlayerError");
                if (options.logError)
                    console.error(customErr.toString());

                this.emit(MusicPlayerEvent.Error, customErr);
            });
            this.player.on(AudioPlayerStatus.Idle, () => this.onIdle());
            this.player.on(AudioPlayerStatus.Playing, () => this.clearIdleTimer());
        }
    }

    public join(): VoiceConnection {
        if (!this.connectionData) {
            const err = new MusicPlayerError("No connection data available.", "ConnectionError");
            if (this.options.logError)
                console.error(err.toString());

            this.emit(MusicPlayerEvent.Error, err);

            throw err;
        }

        const connection = joinVoiceChannel(this.connectionData);
        try {
            entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        }

        catch (e: any) {
            connection.destroy();
            const err = new MusicPlayerError(`Can't connect to voice channel: ${e.message}`, "ConnectionError");
            if (this.options.logError)
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

    private ensureConnection() {
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
                if (!snippet)
                    continue;

                const lyrics = snippet.split("\n").map(line => htmlToText(line).trim()).join("\n").trim();

                return lyrics || null;
            }

            catch (e) {
                const err = new MusicPlayerError(`Lyrics fetch failed for ${url}: ${e}`, "LyricsError");
                if (this.options.logError)
                    console.error(err.toString());

                this.emit(MusicPlayerEvent.Error, err);

                continue;
            }
        }

        return null;
    }

    public async isPlaylist(url: string): Promise<boolean> {
        try {
            if (this.useLavalink && this.manager) {
                const res = await (this.player as Player).search(url);

                return res.loadType === "PLAYLIST_LOADED";
            }

            else {
                return playdl.yt_validate(url) === "playlist" ||
                    playdl.sp_validate(url) === "playlist" ||
                    (await playdl.dz_validate(url)) === "playlist" ||
                    scdl.isPlaylistURL(url);
            }
        }

        catch (e) {
            const err = new MusicPlayerError(`Failed to validate playlist URL ${url}: ${e}`, "PlaylistValidationError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return false;
        }
    }

    public async searchPlaylists(query: string, platform?: SearchPlatform, limit = 5): Promise<PlaylistMetadata[]> {
        const platforms = platform ? [platform] : ["youtube", "spotify", "soundcloud", "deezer"];

        for (const plat of platforms) {
            const results = await this.searchOnPlaylistPlatform(query, plat as SearchPlatform, limit);
            if (results.length > 0) {
                return results;
            }
        }

        return [];
    }

    private async searchOnPlaylistPlatform(query: string, platform: SearchPlatform, limit: number): Promise<PlaylistMetadata[]> {
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

                    const customErr = new MusicPlayerError(`Playlist search failed on ${platform}: ${err.message}`, "SearchError");
                    console.error(customErr.toString());
                    this.emit(MusicPlayerEvent.Error, customErr);


                    throw customErr;
                }
            }
            const err = new MusicPlayerError("Max retries reached for playlist search.", "SearchError");
            console.error(err.toString());
            throw err;
        };

        try {
            if (platform === "youtube") {
                const results = await retry(() => playdl.search(query, { limit, source: { youtube: "playlist" } }));

                return results.map(r => ({
                    title: r.title || "Untitled Playlist",
                    url: r.url,
                    trackCount: r.total_videos || 0, // Approximate
                    thumbnail: r.thumbnail?.url,
                    source: "youtube"
                })) as PlaylistMetadata[];
            }

            else if (platform === "spotify") {
                const results = await retry(() => playdl.search(query, { limit, source: { spotify: "playlist" } }));

                return results.map(r => ({
                    title: r.name || "Untitled Playlist",
                    url: r.url,
                    trackCount: r.tracksCount || 0,
                    thumbnail: r.thumbnail?.url,
                    source: "spotify"
                }));
            }

            else if (platform === "soundcloud") {
                const results = await retry(() => scdl.search({ query, resourceType: "playlists", limit }));

                return results.collection.map((r: any) => ({
                    title: r.title || "Untitled Playlist",
                    url: r.permalink_url,
                    trackCount: r.track_count || 0,
                    thumbnail: r.artwork_url || r.user?.avatar_url,
                    source: "soundcloud"
                }));
            }

            else if (platform === "deezer") {
                const results = await retry(() => playdl.search(query, { limit, source: { deezer: "playlist" } }));

                return results.map(r => ({
                    title: r.title || "Untitled Playlist",
                    url: r.url,
                    trackCount: r.tracksCount || 0,
                    thumbnail: r.picture?.medium,
                    source: "deezer"
                }));
            }
        }

        catch (err) {
            console.error(new MusicPlayerError(`Playlist search error on ${platform}: ${err}`, "SearchError").toString());

            return [];
        }

        return [];
    }

    private async loadPlaylist(url: string): Promise<TrackMetadata[]> {
        try {
            const playlist_result = await this.searchPlaylists(url);
            if (this.useLavalink && this.manager) {
                const res = await (this.player as Player).search(playlist_result[0].url);
                console.log("🚀 ~ MusicPlayer ~ loadPlaylist ~ res:", res)

                if (res.loadType === "PLAYLIST_LOADED") {
                    return res.tracks.map(t => ({
                        title: t.title || "Untitled Track",
                        author: t.author,
                        duration: t.isStream ? undefined : Math.floor(t.duration / 1000),
                        thumbnail: t.thumbnail || undefined,
                        source: this.detectSource(t.uri),
                        url: t.uri
                    })) as TrackMetadata[];
                }

                else {
                    // Fallback if Lavalink fails for the platform
                    return this.loadPlaylistFallback(url);
                }
            }

            else {
                return this.loadPlaylistFallback(url);
            }
        }

        catch (e) {
            const err = new MusicPlayerError(`Failed to load playlist tracks from ${url}: ${e}`, "PlaylistError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return [];
        }
    }

    private async loadPlaylistFallback(url: string): Promise<TrackMetadata[]> {
        try {
            if (playdl.yt_validate(url) === "playlist") {
                const info = await playdl.playlist_info(url, { incomplete: true });
                const videos = await info.all_videos();

                return videos.map(v => ({
                    title: v.title || "Untitled Track",
                    author: v.channel?.name,
                    duration: v.durationInSec,
                    thumbnail: v.thumbnails[0]?.url,
                    source: "youtube",
                    url: v.url
                }));
            }

            else if (playdl.sp_validate(url) === "playlist") {
                const info = await playdl.spotify(url) as SpotifyPlaylist;
                const tracks = await info.all_tracks();

                return tracks.map(t => ({
                    title: t.name || "Untitled Track",
                    author: t.artists[0]?.name,
                    duration: t.durationInSec,
                    thumbnail: t.thumbnail?.url,
                    source: "spotify",
                    url: t.url
                }));
            }

            else if (await playdl.dz_validate(url) === "playlist") {
                const info = await playdl.deezer(url) as DeezerPlaylist;
                const tracks = await info.all_tracks();

                return tracks.map(t => ({
                    title: t.title || "Untitled Track",
                    author: t.artist?.name,
                    duration: t.durationInSec,
                    thumbnail: t.album.cover?.medium || t.artist.picture?.medium,
                    source: "deezer",
                    url: t.url
                }));
            }

            else if (url.includes("soundcloud.com") && url.includes("/sets/")) {
                const info = await scdl.getSetInfo(url);

                return info.tracks.map((t: TrackInfo) => ({
                    title: t.title || "Untitled Track",
                    author: t.user?.username,
                    duration: Math.floor(t.duration! / 1000),
                    thumbnail: t.artwork_url || t.user?.avatar_url,
                    source: "soundcloud",
                    url: t.permalink_url!
                }));
            }

            const err = new MusicPlayerError(`Unsupported playlist URL: ${url}`, "PlaylistError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return [];
        }

        catch (e) {
            const err = new MusicPlayerError(`Failed to load playlist tracks from ${url}: ${e}`, "PlaylistError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return [];
        }
    }

    public async search(query: string, platform?: SearchPlatform, limit = 1): Promise<TrackMetadata[]> {
        if (limit < 1) {
            const err = new MusicPlayerError("Search limit must be at least 1.", "SearchError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            throw err;
        }

        this.ensureConnection();

        const cacheKey = `${platform || "all"}:${query}:${limit}`;
        if (metadataCache.has(cacheKey)) {
            return metadataCache.get(cacheKey)!.slice(0, limit);
        }

        if (/^https?:\/\//.test(query) && !this.isPlatformUrl(query)) {
            const metadata = {
                title: "Direct Stream",
                author: undefined,
                duration: undefined,
                thumbnail: undefined,
                source: "unknown",
                url: query
            } as TrackMetadata;
            metadataCache.set(cacheKey, [metadata]);

            return [metadata];
        }

        const platforms = platform ? [platform] : ["youtube", "spotify", "soundcloud", "deezer"];

        for (const plat of platforms) {
            const results = await this.searchOnPlatform(query, plat as SearchPlatform, limit);
            if (results.length > 0) {
                metadataCache.set(cacheKey, results);

                return results.slice(0, limit);
            }
        }

        return [];
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
                    this.emit(MusicPlayerEvent.Error, customErr);

                    throw customErr;
                }
            }

            const err = new MusicPlayerError("Max retries reached for search.", "SearchError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            throw err;
        };

        if (this.useLavalink && this.manager) {
            try {
                const searchQuery = `${platform === "youtube"
                    ? "ytsearch"
                    : platform === "soundcloud"
                        ? "scsearch"
                        : platform
                    }:${query}`;
                console.log("🚀 ~ MusicPlayer ~ searchOnPlatform ~ searchQuery:", searchQuery)

                const res = await retry(() => (this.player as Player).search(searchQuery));
                console.log("🚀 ~ MusicPlayer ~ searchOnPlatform ~ res:", res)
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
                        title: r.title || "Untitled Track",
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
                        title: r.name || "Untitled Track",
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
                        title: r.title || "Untitled Track",
                        author: r.user?.full_name,
                        duration: Math.floor(r.full_duration! / 1000),
                        thumbnail: r.artwork_url || r.user?.avatar_url,
                        source: "soundcloud",
                        url: r.permalink_url!
                    }));
                }

                else if (platform === "deezer") {
                    const results = await retry(() => playdl.search(query, { limit, source: { deezer: "track" } }));

                    return results.map(r => ({
                        title: r.title || "Untitled Track",
                        author: r.artist?.name,
                        duration: r.durationInSec,
                        thumbnail: r.album.cover.medium || r.artist.picture?.medium,
                        source: "deezer",
                        url: r.url
                    }));
                }
            }

            catch (e) {
                const err = new MusicPlayerError(`Search error on ${platform}: ${e}`, "SearchError");
                console.error(err.toString());
                this.emit(MusicPlayerEvent.Error, err);

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

    private detectSource(link: string): string {
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
            source: this.detectSource(track) as Source,
            url: track
        };

        try {
            if (this.useLavalink && this.manager) {
                const lvTrack = (await this.manager.search(track)).tracks[0];
                if (!lvTrack)
                    return emptyResult;

                const metadata = {
                    title: lvTrack.title || "Untitled Track",
                    author: lvTrack.author,
                    duration: lvTrack.isStream ? undefined : Math.floor(lvTrack.duration / 1000),
                    thumbnail: lvTrack.thumbnail || undefined,
                    source: this.detectSource(lvTrack.uri),
                    url: lvTrack.uri
                } as TrackMetadata;

                metadataCache.set(track, [metadata]);

                return metadata;
            }

            if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(track)) {
                const info = await playdl.video_info(track).catch(() => null);
                if (!info) return emptyResult;

                const details = info.video_details;
                const metadata = {
                    title: details.title || "Untitled Track",
                    author: details.channel?.name,
                    duration: details.durationInSec,
                    thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url,
                    source: "youtube",
                    url: details.url
                } as TrackMetadata;

                metadataCache.set(track, [metadata]);

                return metadata;
            }

            if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(track)) {
                const info = await scdl.getInfo(track).catch(() => null);
                if (!info) return emptyResult;

                const metadata = {
                    title: info.title || "Untitled Track",
                    author: info.user?.username,
                    duration: Math.floor(info.duration! / 1000),
                    thumbnail: info.artwork_url || info.user?.avatar_url,
                    source: "soundcloud",
                    url: info.uri!
                } as TrackMetadata;

                metadataCache.set(track, [metadata]);

                return metadata;
            }

            const result = await playdl.video_basic_info(track).catch(() => null);
            if (!result)
                return emptyResult;

            const vid = result.video_details;
            const metadata = {
                title: vid.title || "Untitled Track",
                author: vid.channel?.name,
                duration: vid.durationInSec,
                thumbnail: vid.thumbnails?.[0]?.url,
                source: this.detectSource(track),
                url: vid.url
            } as TrackMetadata;
            metadataCache.set(track, [metadata]);

            return metadata;
        }

        catch (e) {
            const err = new MusicPlayerError(`Failed to extract metadata for ${track}: ${e}`, "MetadataError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return emptyResult;
        }
    }

    public async play(input: string | TrackMetadata | TrackMetadata[], radio = false) {
        this.ensureConnection();

        let tracks: TrackMetadata[] = [];
        let isPlaylist = false;
        if (typeof input === "string") {
            isPlaylist = await this.isPlaylist(input);
            if (isPlaylist) {
                tracks = await this.loadPlaylist(input);
                if (tracks.length === 0) {
                    const err = new MusicPlayerError(`No tracks found in playlist: ${input}`, "PlayError");
                    console.error(err.toString());
                    this.emit(MusicPlayerEvent.Error, err);

                    return;
                }
            }

            else {
                const results = await this.search(input, undefined, 1);
                if (results.length === 0) {
                    const err = new MusicPlayerError(`No results for: ${input}`, "PlayError");
                    console.error(err.toString());
                    this.emit(MusicPlayerEvent.Error, err);

                    return;
                }

                tracks = [results[0]];
            }
        }

        else if (Array.isArray(input)) {
            tracks = input;
            isPlaylist = true; // Treat array inputs as playlists for event emission
        }

        else {
            tracks = [input];
        }

        // Sync internal queue with Lavalink queue
        const syncQueue = (track: TrackMetadata) => {
            if (!this.queue.some(t => t.url === track.url)) {
                this.queue.push(track);
            }
        };

        // Determine if fallback to play-dl is needed (e.g., for SoundCloud/Spotify with Lavalink)
        const needsFallback = (track: TrackMetadata) =>
            this.useLavalink && ["soundcloud", "spotify"].includes(track.source);

        if (this.useLavalink && this.manager) {
            try {
                const searched = isPlaylist
                    ? await playdl.playlist_info(tracks[0].url, { incomplete: true })
                    : await playdl.search(input as string);
                console.log("🚀 ~ MusicPlayer ~ play ~ searched:", searched)

                const res = isPlaylist && searched instanceof YouTubePlayList
                    ? (await searched.all_videos())
                    : await (this.player as Player).search(
                        `${(searched as YouTubeVideo[])[0].title} ${(searched as YouTubeVideo[])[0].channel?.name}`
                    );

                console.log("🚀 ~ MusicPlayer ~ play ~ res:", res)
                if (Array.isArray(res)) {
                    res.forEach(t => {
                        const track = {
                            duration: t.durationInSec,
                            title: t.title,
                            thumbnail: t.thumbnails[0].url,
                            author: t.channel?.name,
                            uri: t.url
                        } as Track;

                        (this.player as Player).queue.add(track);
                        syncQueue({
                            title: t.title || "Untitled Track",
                            author: t.channel?.name,
                            duration: Math.floor(t.durationInSec / 1000),
                            thumbnail: t.thumbnails[0].url,
                            source: this.detectSource(t.url) as Source,
                            url: t.url
                        });
                    });
                    const queue = await this.getQueue();
                    console.log("🚀 ~ MusicPlayer ~ play ~ queue:", queue)
                    this.emit(MusicPlayerEvent.QueueAdd, { metadatas: tracks, queue });
                }

                else if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
                    (this.player as Player).queue.add(res.tracks[0]);
                    syncQueue(tracks[0]);
                    const queue = await this.getQueue();
                    this.emit(MusicPlayerEvent.QueueAdd, { metadata: tracks[0], queue });
                }

                else {
                    // Fallback for unsupported sources
                    for (const track of tracks) {
                        if (needsFallback(track)) {
                            await this.playFallback(track);
                        }

                        else {
                            const err = new MusicPlayerError(`Failed to load: ${track.url}`, "PlayError");
                            console.error(err.toString());
                            this.emit(MusicPlayerEvent.Error, err);
                        }
                    }
                }
            }

            catch (e) {
                const err = new MusicPlayerError(`Lavalink failed to load: ${e}`, "PlayError");
                console.error(err.toString());
                this.emit(MusicPlayerEvent.Error, err);

                // Fallback for all tracks
                for (const track of tracks) {
                    await this.playFallback(track);
                }
            }
        }

        else {
            // Non-Lavalink: Add all tracks to queue and emit single event
            for (const track of tracks) {
                syncQueue(track);
            }

            const queue = await this.getQueue();
            this.emit(MusicPlayerEvent.QueueAdd, isPlaylist
                ? { metadatas: tracks, queue }
                : { metadata: tracks[0], queue });

            // Play the first track
            if (this.queue.length > 0) {
                const firstTrack = this.queue[0]; // Don't shift yet, let onIdle handle it
                await this.playFallback(firstTrack, true);
            }
        }

        // Update history and start playback if not already playing
        tracks.forEach(track => this.history.push(track));
        if (!this.playing && !radio) {
            if (this.useLavalink && this.manager && this.player instanceof Player) {
                (this.player as Player).play();
            }

            else if (this.player instanceof AudioPlayer && this.queue.length > 0) {
                const firstTrack = this.queue.shift()!;
                await this.playFallback(firstTrack, true);
            }
        }
    }

    private async playFallback(track: TrackMetadata, silent = false) {
        const stream = await this.createStream(track.url);
        if (!stream) {
            const err = new MusicPlayerError(`Failed to create stream for ${track.url}`, "StreamError");
            console.error(err.toString());
            this.emit(MusicPlayerEvent.Error, err);

            return;
        }

        const resource = createAudioResource(stream, { inlineVolume: true });
        resource.volume?.setVolume(this.volume / 100);
        (this.player as AudioPlayer).play(resource);
        this.queue.push(track);
        if (!silent) {
            const queue = await this.getQueue();
            this.emit(MusicPlayerEvent.QueueAdd, { metadata: track, queue });
        }
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
            if (this.queue.length > 0) {
                const next = this.queue.shift()!;
                if (this.loopQueue)
                    this.queue.push(next);

                await this.playFallback(next, true); // Silent play for next in queue

                return;
            }

            if (this.loopQueue && this.queue.length === 0 && this.history.length > 0) {
                await this.play(this.history[this.history.length - 1]);

                return;
            }
        }

        if (this.radioMode && this.radioUrls.length > 0 && this.queue.length === 0) {
            const shuffledUrls = this.shuffleArray([...this.radioUrls]);
            for (const url of shuffledUrls) {
                await this.play(url, true);
            }

            return;
        }

        const queue = await this.getQueue();
        this.emit(MusicPlayerEvent.Finish, { queue, history: this.history.map(h => h.url) });
        if (this.autoLeaveOnEmptyQueue) {
            this.emit(MusicPlayerEvent.Disconnect);
            this.disconnect();
        }

        else {
            this.startIdleTimer();
        }
    }

    private async createStream(url: string): Promise<Stream.Readable | null> {
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

                    const customErr = new MusicPlayerError(`Stream error for ${url}: ${err.message}`, "StreamError");
                    console.error(customErr.toString());

                    throw customErr;
                }
            }

            const err = new MusicPlayerError(`Max retries reached for stream: ${url}`, "StreamError");
            console.error(err.toString());

            throw err;
        };

        if (playdl.yt_validate(url) === "video") {
            return await retry(() => playdl.stream(url, { quality: 2 }).then(s => s.stream));
        }

        if (playdl.sp_validate(url) === "track") {
            const sp_info = await playdl.spotify(url).catch(() => null) as SpotifyTrack;
            if (!sp_info) {
                const err = new MusicPlayerError(`Failed to fetch Spotify info for ${url}`, "StreamError");
                console.error(err.toString());
                this.emit(MusicPlayerEvent.Error, err);

                return null;
            }

            const search = await retry(() => playdl.search(`${sp_info.name} ${sp_info.artists[0]?.name || ""}`, { limit: 1 }));
            if (search.length > 0) {
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
                this.emit(MusicPlayerEvent.Error, err);

                return null;
            }

            const search = await retry(() => playdl.search(`${dz_info.title} ${dz_info.artist?.name || ""}`, { limit: 1 }));
            if (search.length > 0) {
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

    public async skip() {
        const current = this.useLavalink ? (this.player as Player).queue.current?.uri : this.history[this.history.length - 1]?.url;
        if (current) {
            this.history.push({ url: current } as TrackMetadata);
        }

        const queue = await this.getQueue();
        this.emit(MusicPlayerEvent.Skip, { queue, history: this.history.map(h => h.url) });
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
            if (this.options.logError)
                console.error(err.toString());

            this.emit(MusicPlayerEvent.Error, err);

            return;
        }

        const queue = await this.getQueue();
        const prev = this.history.pop()!;
        await this.play(prev);
        this.emit(MusicPlayerEvent.Previous, { metadata: prev, queue, history: this.history.map(h => h.url) });
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
        const queue = await this.getQueue();
        this.emit(MusicPlayerEvent.Shuffle, { queue });
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
        const queue = await this.getQueue();
        this.emit(MusicPlayerEvent.Shuffle, { queue });
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
                const metadata = await this.extractMetadata(track.uri!);
                tracks.push(metadata);
            }

            return tracks;
        }

        return [...this.queue];
    }

    public getVolume(): number {
        return this.volume;
    }

    public isPlaying(): boolean {
        if (this.useLavalink && this.manager)
            (this.player as Player).playing;

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

    public isConnected(): boolean {
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