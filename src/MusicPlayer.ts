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
    SearchPlatform
} from "./types";
import { htmlToText } from "html-to-text";
import EventEmitter from "events";
import { TextChannel } from "discord.js";
import {
    Manager,
    Player,
    Track
} from "erela.js";
import playdl, { InfoData } from "play-dl";
import scdl from "soundcloud-downloader";
import type { Stream } from "stream";
import { TrackInfo } from "soundcloud-downloader/src/info";

/**
 * Manages voice connection, playback, queue, history, and loop modes.
 * Emits events defined in MusicPlayerEvent.
 *
 * Note: If using Lavalink (Erela.js), set up voice update handlers in your Discord client code:
 * client.ws.on('VOICE_SERVER_UPDATE', (data) => {
 *   client.musicManager.updateVoiceState(data);
 * });
 * client.ws.on('VOICE_STATE_UPDATE', (data) => {
 *   client.musicManager.updateVoiceState(data);
 * });
 * Also, call manager.init(client.user.id) in client 'ready' event if using Lavalink!
 */
export class MusicPlayer extends EventEmitter<TypedEmitter> {
    // Player main data
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
    private shuffield: boolean = false;
    private useLavalink: boolean;

    // Radio
    private radioMode: boolean = false;
    private radioUrls: string[] = [];

    // Connection
    private connectionData: {
        channelId: string;
        guildId: string;
        adapterCreator: any;
        selfDeaf?: boolean;
        selfMute?: boolean;
        group?: string;
        debug?: boolean;
    } | null = null;

    private youtubeCookie: string | undefined;

    /**
     * Initializes a new MusicPlayer instance.
     * @param channel - Discord voice channel to connect to.
     * @param initialVolume - Initial volume (0–200), defaults to 100.
     * @param lavaLinkManager - Optional Erela.js Manager instance for Lavalink support.
     * @param options - Options for auto-leave, idle timeout, and YouTube cookie.
     */
    constructor(
        public channel: VoiceChannel,
        public textChannel: TextChannel,
        initialVolume = 100,
        lavaLinkManager?: Manager,
        options: MusicPlayerOptions = {}
    ) {
        super();

        this.useLavalink = !!lavaLinkManager;
        this.manager = lavaLinkManager;
        this.volume = initialVolume;
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
            this.player = this.manager!.create({
                guild: this.connectionData.guildId,
                voiceChannel: this.connectionData.channelId,
                textChannel: this.textChannel.id,
                selfDeafen: this.connectionData.selfDeaf,
                selfMute: this.connectionData.selfMute,
                volume: this.volume
            });

            this.manager.on("trackStart", async (player, track) => {
                this.playing = true;
                this.clearIdleTimer();
                this.emit(MusicPlayerEvent.Start, { metadata: await this.extractMetadata(track.uri), queue: await this.getQueue() });
            });

            this.manager.on("trackEnd", () => {
                this.onIdle();
            });

            this.manager.on("queueEnd", () => {
                this.playing = false;
                this.onIdle();
            });

            this.manager.on("trackError", (player, track, error) => {

                this.emit(MusicPlayerEvent.Error, this.createError(`Track error: ${error.error}`));
                this.skip();
            });

            this.manager.on("trackStuck", (player, track, threshold) => {
                this.emit(MusicPlayerEvent.Error, this.createError(`Track stuck for ${threshold.thresholdMs}ms`));
                this.skip();
            });

            this.manager.on("socketClosed", (player, payload) => {
                this.emit(MusicPlayerEvent.Error, this.createError(`Socket closed: ${payload.reason}`));
            });
        }

        else {
            this.player = createAudioPlayer();
            this.player.on("error", err => {
                this.emit(MusicPlayerEvent.Error, this.createError("Player error: " + err.message));
            });
            this.player.on(AudioPlayerStatus.Idle, () => this.onIdle());
            this.player.on(AudioPlayerStatus.Playing, () => this.clearIdleTimer());

            if (options.youtubeCookie) {
                void playdl.setToken({
                    youtube: {
                        cookie: options.youtubeCookie
                    }
                });
                this.youtubeCookie = options.youtubeCookie;
            }
        }
    }

    /**
     * Joins the voice channel without subscribing to audio player.
     * @returns The VoiceConnection instance.
     */
    public join(): VoiceConnection {
        if (!this.connectionData) {
            throw this.createError("No connection data available.");
        }

        const connection = joinVoiceChannel({
            channelId: this.connectionData.channelId,
            guildId: this.connectionData.guildId,
            adapterCreator: this.connectionData.adapterCreator,
            selfDeaf: this.connectionData.selfDeaf ?? true,
            selfMute: this.connectionData.selfMute ?? false,
            group: this.connectionData.group,
            debug: this.connectionData.debug
        });

        try {
            entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        }

        catch (e: any) {
            connection.destroy();
            this.emit(MusicPlayerEvent.Error, this.createError(`Can't connect to the voice channel: ${e.message}`));
        }

        if (!this.useLavalink) {
            connection.subscribe(this.player as AudioPlayer);
        }

        return connection;
    }

    /**
     * Sets the connection data for the voice channel.
     * @param data - Connection settings.
     * @returns The current MusicPlayer instance.
     */
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

        if (this.useLavalink) {
            (this.player as Player).voiceChannel = data.channelId;
            (this.player as Player).guild = data.guildId;
        }

        return this;
    }

    /**
     * Establishes a connection to the voice channel if not already connected.
     */
    private async ensureConnection() {
        if (this.useLavalink) {
            if ((this.player as Player).state !== "CONNECTED") {
                (this.player as Player).connect();
            }
        } else {
            this.join();
        }
    }

    /**
     * Starts a timer to disconnect after inactivity.
     */
    private startIdleTimer() {
        if (this.autoLeaveOnIdleMs > 0 && !this.idleTimer && !this.playing) {
            this.idleTimer = setTimeout(() => {
                this.emit(MusicPlayerEvent.Disconnect);
                this.disconnect();
            }, this.autoLeaveOnIdleMs);
        }
    }

    /**
     * Clears the idle timer if it exists.
     */
    private clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    /**
     * Randomly shuffles an array.
     * @param array - Array to shuffle.
     * @returns New shuffled array.
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    /**
     * Searches Google for song lyrics and returns them, or null if not found.
     * @param title - Song title.
     * @param artist - Optional artist name for better accuracy.
     */
    public async searchLyrics(title: string, artist?: string): Promise<string | null> {
        const delim1 = '</div></div></div></div><div class="hwc"><div class="BNeawe tAd8D AP7Wnd"><div><div class="BNeawe tAd8D AP7Wnd">';
        const delim2 = '</div></div></div></div></div><div><span class="hwc"><div class="BNeawe uEec3 AP7Wnd">';
        const GOOGLE = "https://www.google.com/search?q=";
        let html: string = "";
        const query = encodeURIComponent(`${artist ? artist + " " : ""}${title}`);
        const attempts = [
            `${GOOGLE}${query}+lyrics`,
            `${GOOGLE}${query}+song+lyrics`,
            `${GOOGLE}${query}+song`,
            `${GOOGLE}${query}`
        ];
        for (const url of attempts) {
            try {
                const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
                html = await res.text();

                break;
            }

            catch {
                continue;
            }
        }

        if (!html) return null;

        let snippet: string;
        try {
            [, snippet] = html.split(delim1);
            [snippet] = snippet.split(delim2);
        }

        catch {
            return null;
        }

        const rawLines = snippet.split("\n");
        let lyrics = "";
        for (const line of rawLines) {
            lyrics += htmlToText(line).trim() + "\n";
        }

        lyrics = lyrics.trim();

        return lyrics || null;
    }

    /**
     * Searches for tracks across platforms. Returns a list of results.
     * @param query - Search query or URL.
     * @param platform - Optional platform to search on. If not specified, searches in order: YouTube (or Spotify if no Lavalink), Spotify, SoundCloud, Deezer.
     * @returns Array of TrackMetadata.
     */
    public async search(query: string, platform?: SearchPlatform): Promise<TrackMetadata[]> {
        await this.ensureConnection();

        if (/^https?:\/\//.test(query) && !this.isPlatformUrl(query)) {
            // Direct stream URL (e.g., radio), treat as unknown source
            return [{
                title: "Direct Stream",
                author: undefined,
                duration: undefined,
                thumbnail: undefined,
                source: "unknown",
                url: query
            }];
        }

        const platforms = platform ? [platform] : this.useLavalink ? ["youtube", "spotify", "soundcloud", "deezer"] : ["spotify", "soundcloud", "youtube", "deezer"];

        for (const plat of platforms) {
            const results = await this.searchOnPlatform(query, plat as "youtube");
            if ((results as TrackMetadata[])?.length > 0) {
                return results as TrackMetadata[];
            }
        }

        return [];
    }

    private async searchOnPlatform(query: string, platform: SearchPlatform): Promise<Promise<TrackMetadata> | TrackMetadata[] | Promise<TrackMetadata>[]> {
        if (this.useLavalink) {
            const res = await (this.player as Player).search(`${platform === "youtube" ? "ytsearch" : platform === "soundcloud" ? "scsearch" : platform}:${query}`);
            if (res.loadType === "LOAD_FAILED" || res.loadType === "NO_MATCHES") {
                return [];
            }

            return res.tracks.map(async t => await this.extractMetadata(t.uri));
        }

        else {
            if (platform === "youtube") {
                const results = await playdl.search(query, { limit: 5, source: { youtube: "video" } });

                return results.map(r => ({
                    title: r.title,
                    author: r.channel?.name,
                    duration: r.durationInSec,
                    thumbnail: r.thumbnails[0].url,
                    source: "youtube",
                    url: r.url
                }));
            }

            else if (platform === "spotify") {
                const results = await playdl.search(query, { limit: 5, source: { spotify: "track" } });

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
                const results = await scdl.search({ query, resourceType: "tracks", limit: 5 });

                return results.collection.map((r) => {
                    r = r as TrackInfo;

                    return {
                        title: r.title!,
                        author: r.user?.full_name!,
                        duration: Math.floor(r.full_duration! / 1000),
                        thumbnail: r.artwork_url || r.user?.avatar_url,
                        source: "soundcloud",
                        url: r.uri!
                    }
                });
            }

            else if (platform === "deezer") {
                const results = await playdl.search(query, { limit: 5, source: { deezer: "track" } });

                return results.map(r => ({
                    title: r.title,
                    author: r.artist?.name,
                    duration: r.durationInSec,
                    thumbnail: r.artist.picture?.medium,
                    source: "deezer",
                    url: r.url
                }));
            }
            return [];
        }
    }

    private isPlatformUrl(url: string): boolean {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|spotify\.com|soundcloud\.com|deezer\.com)\//.test(url);
    }

    /**
     * Starts radio mode with a list of URLs.
     */
    public async startRadio(urls: string[]) {
        this.radioMode = true;
        this.radioUrls = urls;
        const shuffledUrls = this.shuffleArray([...urls]);
        for (const url of shuffledUrls) {
            await this.play(url, true);
        }
        this.loopQueue = true;
    }

    /**
     * 
     * @param link - Erela.js Track url here.
     * @returns Track source
     */
    private detectSource(link: string) {
        if (!link) return "unknown";

        const url = link;

        if (url.includes("youtube.com") || url.includes("youtu.be"))
            return "youtube";

        if (url.includes("spotify.com"))
            return "spotify";

        if (url.includes("soundcloud.com"))
            return "soundcloud";

        if (url.includes("deezer.com"))
            return "deezer";

        return "unknown";
    }


    /**
     * Fetches metadata for a track.
     * @param track - URL.
     * @returns Track metadata.
     */
    private async extractMetadata(track: string): Promise<TrackMetadata> {
        const empity_resualt: TrackMetadata = { title: undefined, author: undefined, duration: undefined, thumbnail: undefined, source: "unknown", url: track };

        try {
            if (typeof track === "object" && "identifier" in track && this.useLavalink && this.manager) {
                const lvTrack = (await this.manager.search(track))?.tracks[0];

                return {
                    title: lvTrack.title,
                    author: lvTrack.author,
                    duration: lvTrack.isStream ? undefined : Math.floor(lvTrack.duration / 1000),
                    thumbnail: lvTrack.thumbnail || undefined,
                    source: this.detectSource(lvTrack.uri) || "unknown",
                    url: lvTrack.uri || ""
                };
            }

            if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(track)) {
                let info: InfoData | undefined;
                try { info = await playdl.video_info(track); } catch { }

                if (!info)
                    return empity_resualt;

                const details = info.video_details;
                return {
                    title: details.title,
                    author: details.channel?.name,
                    duration: details.durationInSec,
                    thumbnail: details.thumbnails[details.thumbnails.length - 1].url,
                    source: "youtube",
                    url: details.url
                };
            }

            if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(track)) {
                const info = await scdl.getInfo(track);
                return {
                    title: info.title,
                    author: info.user?.username,
                    duration: Math.floor(info.duration! / 1000),
                    thumbnail: info.artwork_url || info.user?.avatar_url,
                    source: "soundcloud",
                    url: info.uri!
                };
            }

            const result = await playdl.video_basic_info(track);
            const vid = result.video_details;

            return {
                title: vid.title,
                author: vid.channel?.name,
                duration: vid.durationInSec,
                thumbnail: vid.thumbnails?.[0]?.url,
                source: "unknown",
                url: vid.url
            };

        }

        catch {
            return empity_resualt;
        }
    }

    /**
     * Plays a song by query, URL, or search result. Supports playlists if using Lavalink.
     * @param input - Search query, URL, TrackMetadata, or array of TrackMetadata.
     * @param radio - If true, for radio mode (no emit Start for each).
     */
    public async play(input: string | TrackMetadata | TrackMetadata[], radio = false) {
        await this.ensureConnection();

        let tracks: TrackMetadata[] = [];
        if (typeof input === "string") {
            const results = await this.search(input);
            if (results.length === 0) {
                this.emit(MusicPlayerEvent.Error, this.createError(`No results for: ${input}`));
                return;
            }

            tracks = [results[0]]; // Take first if string
        }

        else if (Array.isArray(input)) {
            tracks = input;
        }

        else {
            tracks = [input];
        }

        for (const track of tracks) {
            if (this.useLavalink) {
                const res = await (this.player as Player).search(track.url);
                if (res.loadType === "PLAYLIST_LOADED") {
                    res.tracks.forEach(t => (this.player as Player).queue.add(t));
                }

                else if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
                    (this.player as Player).queue.add(res.tracks[0]);
                }

                else {
                    this.emit(MusicPlayerEvent.Error, this.createError(`Failed to load: ${track.url}`));

                    continue;
                }
            }

            else {
                const stream = await this.createStream(track.url);
                if (!stream) {
                    this.emit(MusicPlayerEvent.Error, this.createError(`Failed to create stream for ${track.url}`));

                    continue;
                }

                const resource = createAudioResource(stream, { inlineVolume: true });
                resource.volume?.setVolume(this.volume / 100);
                (this.player as AudioPlayer).play(resource);
            }

            this.history.push(track);
            this.emit(MusicPlayerEvent.QueueAdd, { metadata: track, queue: await this.getQueue() });
        }

        if (!this.playing && !radio) {
            if (this.useLavalink) {
                (this.player as Player).play();
            }
        }
    }

    private async createStream(url: string): Promise<Stream.Readable | null> {
        try {
            if (playdl.yt_validate(url) === "video") {
                const info = await playdl.stream(url, { quality: 2 });

                return info.stream;
            }

            if (playdl.sp_validate(url) === "track") {
                const sp_info = await playdl.spotify(url);
                const search = await playdl.search(`${sp_info.name}`, { limit: 1 });

                if (search.length > 0) {
                    const yt_info = await playdl.stream(search[0].url, { quality: 2 });

                    return yt_info.stream;
                }
            }

            if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url)) {
                return await scdl.download(url);
            }

            // For Deezer or other, fallback to play-dl if possible
            if (await playdl.dz_validate(url) === "track") {
                const dz_info = await playdl.deezer(url);
                const search = await playdl.search(`${dz_info.title}`, { limit: 1 });

                if (search.length > 0) {
                    const yt_info = await playdl.stream(search[0].url, { quality: 2 });

                    return yt_info.stream;
                }
            }

            // Direct stream
            return url as any; // Assume it's a direct stream URL
        }

        catch (err) {
            console.error("Stream error:", err);
            return null;
        }
    }

    /**
     * Pauses the current playback.
     */
    public pause() {
        if (this.useLavalink) {
            (this.player as Player).pause(true);
        }

        else {
            (this.player as AudioPlayer).pause();
        }

        this.emit(MusicPlayerEvent.Pause);
    }

    /**
     * Resumes the current playback.
     */
    public resume() {
        if (this.useLavalink) {
            (this.player as Player).pause(false);
        }

        else {
            (this.player as AudioPlayer).unpause();
        }

        this.emit(MusicPlayerEvent.Resume);
    }

    /**
     * Sets the playback volume.
     * @param percent - Volume percentage (0–200).
     */
    public setVolume(percent: number) {
        if (percent < 0)
            percent = 0;

        if (percent > 200)
            percent = 200;

        this.volume = percent;
        if (this.useLavalink) {
            (this.player as Player).setVolume(percent);
        }

        else {
            const resource = ((this.player as AudioPlayer).state as AudioPlayerPlayingState).resource;
            resource.volume?.setVolume(percent / 100);
        }

        this.emit(MusicPlayerEvent.VolumeChange, { volume: this.volume });
        return this.volume;
    }

    /**
     * Handles idle state, looping or playing next track as needed.
     */
    private async onIdle() {
        this.playing = false;

        if (this.loopTrack) {
            const last = this.history[this.history.length - 1];
            if (last) {
                await this.play(last);
                return;
            }
        }

        if (this.useLavalink) {
            if (this.loopQueue && (this.player as Player).queue.size === 0 && (this.player as Player).queue.previous) {
                (this.player as Player).queue.add((this.player as Player).queue.previous!);
                (this.player as Player).play();

                return;
            }
        }

        else {
            if (this.loopQueue && (await this.getQueue()).length === 0 && this.history.length > 0) {
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

    /**
     * Skips the current track and moves to the next.
     */
    public async skip() {
        const current = this.useLavalink ? (this.player as Player).queue.current?.uri : this.history[this.history.length - 1];
        if (current) {
            this.history.push({ url: current } as TrackMetadata); // Simplified
        }

        this.emit(MusicPlayerEvent.Skip, { queue: await this.getQueue(), history: this.history.map(h => h.url) });
        if (this.useLavalink) {
            (this.player as Player).stop();
        }

        else {
            (this.player as AudioPlayer).stop();
        }
    }

    /**
     * Plays the previous track from history.
     */
    public async previous() {
        if (this.history.length < 1) {
            this.emit(MusicPlayerEvent.Error, this.createError("No previous track."));

            return;
        }

        const prev = this.history.pop()!;
        await this.play(prev);
        this.emit(MusicPlayerEvent.Previous, { metadata: prev, queue: await this.getQueue(), history: this.history.map(h => h.url) });
    }

    /**
     * Shuffles the queue and saves the previous order.
     */
    public async shuffle() {
        this.previousQueueOrder = await this.getQueue();
        if (this.useLavalink) {
            (this.player as Player).queue.shuffle();
        }

        else {
            // Manual shuffle for fallback
            const queue = await this.getQueue();
            const shuffled = this.shuffleArray(queue);
            // Since fallback doesn't have built-in queue, we need to simulate
            // But since fallback uses history or something, perhaps rebuild
            // For simplicity, assume queue is managed in history or separate array, but in fallback, we can use a queue array
            // Wait, in fallback, we need to add a queue array like in original code
            // Let's add private queue: TrackMetadata[] = []; in class
            this.queue = this.shuffleArray(this.queue);
        }
        this.shuffield = true;
        this.emit(MusicPlayerEvent.Shuffle, { queue: await this.getQueue() });
    }

    /**
     * Restores the queue to its pre-shuffle order.
     */
    public async undoShuffle() {
        if (this.useLavalink) {
            (this.player as Player).queue.clear();
            this.previousQueueOrder.forEach(meta => this.play(meta, true)); // Silent add
        }

        else {
            this.queue = this.previousQueueOrder;
        }

        this.shuffield = false;
        this.emit(MusicPlayerEvent.Shuffle, { queue: await this.getQueue() });
    }

    /**
     * Toggles queue looping on or off.
     */
    public toggleLoopQueue() {
        this.loopQueue = !this.loopQueue;
        if (this.loopQueue)
            this.loopTrack = false;

        this.emit(MusicPlayerEvent.LoopQueue, { enabled: this.loopQueue });

        return this.loopQueue;
    }

    /**
     * Checks if queue looping is enabled.
     * @returns True if enabled, false otherwise.
     */
    public isLoopQueue() {
        return this.loopQueue;
    }

    /**
     * Toggles track looping on or off.
     */
    public toggleLoopTrack() {
        this.loopTrack = !this.loopTrack;
        if (this.loopTrack)
            this.loopQueue = false;

        this.emit(MusicPlayerEvent.LoopTrack, { enabled: this.loopTrack });

        return this.loopTrack;
    }

    /**
     * Checks if track looping is enabled.
     * @returns True if enabled, false otherwise.
     */
    public isLoopTrack() {
        return this.loopTrack;
    }

    /**
     * Disconnects from the voice channel and cleans up resources.
     */
    public disconnect() {
        this.clearIdleTimer();
        if (this.useLavalink) {
            (this.player as Player).destroy();
        }

        else {
            (this.player as AudioPlayer).stop();
        }

        this.playing = false;
        this.history = [];
        this.radioMode = false;
        this.radioUrls = [];
        this.emit(MusicPlayerEvent.Disconnect);
    }

    /**
     * Stops playback and optionally disconnects.
     * @param noLeave - If true, stays connected to the channel.
     */
    public stop(noLeave = true) {
        if (this.useLavalink) {
            (this.player as Player).stop();
            (this.player as Player).queue.clear();
        }

        else {
            (this.player as AudioPlayer).stop();
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

    /**
     * Returns a copy of the current queue.
     * @returns Array of track metadata.
     */
    public async getQueue(): Promise<TrackMetadata[]> {
        if (this.useLavalink) {
            return Promise.resolve((this.player as Player).queue.map(async a => await this.extractMetadata(a.uri!))) as any as Promise<TrackMetadata[]>;
        }

        else {
            return [...this.queue];
        }
    }

    /**
     * Gets the current volume percentage.
     * @returns Volume (0–200).
     */
    public getVolume() {
        if (this.useLavalink) {
            return (this.player as Player).volume;
        }

        else {
            const resource = ((this.player as AudioPlayer).state as AudioPlayerPlayingState).resource;

            return Math.round((resource.volume?.volume || this.volume / 100) * 100);
        }
    }

    /**
     * Checks if the player is currently playing.
     * @returns True if playing, false otherwise.
     */
    public isPlaying(): boolean {
        return this.playing;
    }

    /**
     * Checks if the player is paused.
     * @returns True if paused, false otherwise.
     */
    public isPaused(): boolean {
        if (this.useLavalink) {
            return (this.player as Player).paused;
        }

        else {
            return (this.player as AudioPlayer).state.status === AudioPlayerStatus.Paused;
        }
    }

    /**
     * Checks if the queue is shuffled.
     * @returns True if shuffled, false otherwise.
     */
    public isShuffiled(): boolean {
        return this.shuffield;
    }

    /**
     * Checks if the bot is actively connected to a voice channel.
     * @param guildId - Optional guild ID; uses stored guild ID if not provided.
     * @returns True if actively connected, false otherwise.
     */
    public isConnected(guildId?: string): boolean {
        if (this.useLavalink) {
            return (this.player as Player).node.connected;
        }

        else {
            return (this.player as AudioPlayer).state.status !== AudioPlayerStatus.Idle;
        }
    }

    /**
     * Creates a custom error for the music player.
     * @param message - Error message.
     * @returns Custom error instance.
     */
    private createError(message: string) {
        class discordPlayerError extends Error {
            constructor() {
                super();
                this.name = "Persian-Caeasr discord-player";
                this.message = message;
            }
        }

        return new discordPlayerError();
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