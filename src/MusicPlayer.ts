import {
    joinVoiceChannel,
    VoiceConnection,
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
    AudioPlayerPlayingState,
    getVoiceConnection
} from "@discordjs/voice";
import {
    VoiceChannel,
    TypedEmitter,
    MusicPlayerEvent,
    TrackMetadata,
    MusicPlayerOptions
} from "./types";
import { htmlToText } from "html-to-text";
import type { Stream } from "stream";
import EventEmitter from "events";
import playdl, { InfoData } from "play-dl";
import ytdlp from "yt-dlp-exec";
import scdl from "soundcloud-downloader";

/**
 * Manages voice connection, playback, queue, history, and loop modes.
 * Emits events defined in MusicPlayerEvent.
 */
export class MusicPlayer extends EventEmitter<TypedEmitter> {
    // Player main data
    private previousQueueOrder: TrackMetadata[] = [];
    private connection: VoiceConnection | null = null;
    private player: AudioPlayer;
    private volume: number;
    private queue: TrackMetadata[] = [];
    private history: string[] = [];
    private loopQueue = false;
    private loopTrack = false;
    private playing = false;
    private autoLeaveOnEmptyQueue: boolean;
    private autoLeaveOnIdleMs: number;
    private idleTimer: NodeJS.Timeout | null = null;
    private shuffield: boolean = false;

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

    /**
     * Initializes a new MusicPlayer instance.
     * @param channel - Discord voice channel to connect to.
     * @param initialVolume - Initial volume (0–100), defaults to 100.
     * @param options - Options for auto-leave and idle timeout.
     */
    constructor(
        public channel: VoiceChannel,
        initialVolume = 100,
        options: MusicPlayerOptions = {}
    ) {
        super();
        this.player = createAudioPlayer(); // Creates a new audio player for streaming music
        this.volume = Math.round(initialVolume / 100); // Converts volume from percentage (0–100) to decimal (0–1)
        this.autoLeaveOnEmptyQueue = options.autoLeaveOnEmptyQueue ?? true; // Default: leave voice channel when queue is empty
        this.autoLeaveOnIdleMs = options.autoLeaveOnIdleMs ?? 5 * 60_000; // Default: 5-minute idle timeout before disconnecting

        this.connectionData = {
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
            debug: false
        };

        // Set up event listeners for error handling, idle state, and playback start
        this.player.on("error", err => {
            this.emit(MusicPlayerEvent.Error, this.createError("Player have error => " + err.message));
        });
        this.player.on(AudioPlayerStatus.Idle, () => this.onIdle()); // Triggers when no audio is playing
        this.player.on(AudioPlayerStatus.Playing, () => this.clearIdleTimer()); // Clears idle timer when music starts

        if (options.youtubeCookie)
            void playdl.setToken({
                youtube: {
                    cookie: options.youtubeCookie
                }
            });
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

        return this;
    }


    /**
     * Joins the voice channel using provided or stored connection data.
     * @param data - Optional connection settings; uses stored data if not provided.
     * @returns The VoiceConnection instance.
     */
    public join(data?: {
        channelId: string;
        guildId: string;
        adapterCreator: any;
        selfDeaf?: boolean;
        selfMute?: boolean;
        group?: string;
        debug?: boolean;
    }): VoiceConnection {
        if (!data && !this.connectionData) {
            throw this.createError("No connection data available to join voice channel.");
        }
        const connectionData = data || this.connectionData!;
        this.connection = joinVoiceChannel({
            channelId: connectionData.channelId,
            guildId: connectionData.guildId,
            adapterCreator: connectionData.adapterCreator,
            selfDeaf: connectionData.selfDeaf ?? true,
            selfMute: connectionData.selfMute ?? false,
            group: connectionData.group,
            debug: connectionData.debug
        });

        this.connection.subscribe(this.player);

        return this.connection;
    }

    /**
     * Establishes a connection to the voice channel if not already connected.
     */
    private async ensureConnection() {

        if (!this.connection) {
            this.connection = this.join();

            try {
                await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
            } catch (e: any) {
                this.connection.destroy();
                this.connection = null;
                this.emit(MusicPlayerEvent.Error, this.createError("Can't connect to the voice channel. => " + e.message));
            }
        }

        return;
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
     * Resolves a query to a track URL or returns the URL if provided.
     * @param query - Search query or URL.
     * @returns Resolved URL.
     */
    public async search(query: string): Promise<string> {
        if (/^https?:\/\//.test(query)) return query;
        const sc_results = await scdl.search({ query, resourceType: "tracks", limit: 1 });
        let url = sc_results.collection?.[0]?.permalink_url;
        if (!url) {
            const playdl_results = await playdl.search(query, {
                limit: 1,
                source: { spotify: "track", soundcloud: "tracks", youtube: "video", deezer: "track" }
            });
            url = playdl_results[0]?.url;
        }

        return url;
    }

    /**
     * Starts radio mode with a list of URLs.
     * @param urls - Array of URLs to play.
     */
    public async startRadio(urls: string[]) {
        this.radioMode = true;
        this.radioUrls = urls;
        const shuffledUrls = this.shuffleArray([...urls]);
        this.queue = await Promise.all(shuffledUrls.map(async url => await this.fetchMetadata(url)));
        if (this.queue.length > 0) {
            const first = this.queue.shift()!;
            await this.playUrl(first.url, first);
        }
    }

    /**
     * Fetches metadata for a track URL.
     * @param url - Track URL.
     * @returns Track metadata.
     */
    private async fetchMetadata(url: string): Promise<TrackMetadata> {
        const empity_resualt: TrackMetadata = { title: undefined, author: undefined, duration: undefined, thumbnail: undefined, source: "unknown", url };

        try {
            if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
                let info: InfoData | undefined;
                try { info = await playdl.video_info(url); } catch { }

                if (!info)
                    return empity_resualt;

                const details = info.video_details;
                return {
                    title: details.title,
                    author: details.channel?.name,
                    duration: details.durationInSec,
                    thumbnail: details.thumbnails[details.thumbnails.length - 1].url,
                    source: "youtube",
                    url
                };
            }

            if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url)) {
                const info = await scdl.getInfo(url);
                return {
                    title: info.title,
                    author: info.user?.username,
                    duration: Math.floor(info.duration! / 1000),
                    thumbnail: info.artwork_url || info.user?.avatar_url,
                    source: "soundcloud",
                    url
                };
            }

            const result = await playdl.video_basic_info(url);
            const vid = result.video_details;

            return {
                title: vid.title,
                author: vid.channel?.name,
                duration: vid.durationInSec,
                thumbnail: vid.thumbnails?.[0]?.url,
                source: "unknown",
                url
            };
        }

        catch {
            return empity_resualt;
        }
    }

    /**
     * Create a stream from url.
     * @param url - Track URL.
     */
    private async createStream(url: string): Promise<Stream.Readable | null> {
        try {
            if (playdl.yt_validate(url) === "video") {
                const info = await ytdlp(url, {
                    dumpSingleJson: true,
                    noCheckCertificate: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                    addHeader: "referer:youtube.com,user-agent:Mozilla/5.0"
                });

                const audioUrl = info.url;
                
                return audioUrl as any;
            }

            if (playdl.sp_validate(url) === "track") {
                const sp_info = await playdl.spotify(url);
                const search = await playdl.search(`${sp_info.name} ${sp_info.name}`, { limit: 1 });
                if (search.length > 0) {
                    const yt_info = await playdl.stream(search[0].url, { quality: 2 });

                    return yt_info.stream;
                }
            }

            if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url)) {
                return await scdl.download(url);
            }

            return null;
        } catch (err) {
            console.error("Stream error =>", err);
            return null;
        }
    }

    /**
     * Plays a track URL with its metadata.
     * @param url - Track URL.
     * @param metadata - Track metadata.
     */
    private async playUrl(url: string, metadata: TrackMetadata) {
        this.playing = true;
        this.history.push(url);

        const stream = await this.createStream(url);
        if (!stream) {
            this.emit(MusicPlayerEvent.Error, this.createError("Failed to create stream for " + url));
            return;
        }

        const resource = createAudioResource(stream, { inlineVolume: true });
        resource.volume?.setVolume(this.volume);
        this.player.play(resource);


        if (!(this.player.state as AudioPlayerPlayingState).resource)
            (this.player.state as AudioPlayerPlayingState).resource = resource;

        this.emit(MusicPlayerEvent.Start, { metadata, queue: [...this.queue] });

        return;
    }

    /**
     * Plays a song by query or URL, adding to queue if already playing.
     * @param input - Search query or URL.
     */
    public async play(input: string) {
        await this.ensureConnection();
        const url = await this.search(input);
        const metadata = await this.fetchMetadata(url);
        if (this.playing) {
            this.queue.push(metadata);
            this.emit(MusicPlayerEvent.QueueAdd, { metadata, queue: [...this.queue] });
        }

        else {
            await this.playUrl(url, metadata);
        }

        return;
    }

    /**
     * Pauses the current playback.
     */
    public pause() {
        this.player.pause();
        this.emit(MusicPlayerEvent.Pause);

        return;
    }

    /**
     * Resumes the current playback.
     */
    public resume() {
        this.player.unpause();
        this.emit(MusicPlayerEvent.Resume);

        return;
    }

    /**
     * Sets the playback volume.
     * @param percent - Volume percentage (0–200).
     */
    public setVolume(percent: number) {
        percent /= 100;
        if (percent < 0 || percent > 2) this.volume = 2;

        else this.volume = percent;

        const resource = (this.player.state as AudioPlayerPlayingState).resource;
        try { resource.volume!.setVolume(this.volume); } catch { }

        this.emit(MusicPlayerEvent.VolumeChange, { volume: Math.round(this.volume * 100) });

        return this.volume;
    }

    /**
     * Handles idle state, looping or playing next track as needed.
     */
    private async onIdle() {
        if (this.loopTrack) {
            const url = this.history[this.history.length - 1];
            const metadata = await this.fetchMetadata(url);

            return await this.playUrl(url, metadata);
        }

        if (this.queue.length) {
            const next = this.queue.shift()!;
            if (this.loopQueue) this.queue.push(next);

            return await this.playUrl(next.url, next);
        }

        if (this.radioMode && this.radioUrls.length > 0) {
            const shuffledUrls = this.shuffleArray([...this.radioUrls]);
            this.queue = await Promise.all(shuffledUrls.map(async url => await this.fetchMetadata(url)));
            if (this.queue.length > 0) {
                const next = this.queue.shift()!;

                return await this.playUrl(next.url, next);
            }
        }

        this.playing = false;
        this.emit(MusicPlayerEvent.Finish, { queue: [...this.queue], history: [...this.history] });
        if (this.autoLeaveOnEmptyQueue) {
            this.emit(MusicPlayerEvent.Disconnect);
            this.disconnect();
        }

        else {
            this.startIdleTimer();
        }

        return;
    }

    /**
     * Skips the current track and moves to the next.
     */
    public skip() {
        this.emit(MusicPlayerEvent.Skip, { queue: [...this.queue], history: [...this.history] });
        this.player.stop();

        return;
    }

    /**
     * Plays the previous track from history.
     */
    public async previous() {
        if (this.history.length < 2) {
            this.emit(MusicPlayerEvent.Error, this.createError("No track to previous."));

            return;
        }

        this.history.pop();
        const prevUrl = this.history.pop()!;
        const metadata = await this.fetchMetadata(prevUrl);
        this.queue.unshift(metadata);
        this.emit(MusicPlayerEvent.Previous, { metadata, queue: [...this.queue], history: [...this.history, prevUrl] });
        await this.playUrl(prevUrl, metadata);

        return;
    }

    /**
     * Shuffles the queue and saves the previous order.
     */
    public shuffle() {
        this.previousQueueOrder = [...this.queue];
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }

        this.shuffield = true;
        this.emit(MusicPlayerEvent.Shuffle, { queue: [...this.queue] });

        return;
    }

    /**
     * Restores the queue to its pre-shuffle order, excluding played tracks.
     */
    public undoShuffle() {
        this.queue = this.previousQueueOrder.filter(meta => !this.history.includes(meta.url));
        this.shuffield = false;
        this.emit(MusicPlayerEvent.Shuffle, { queue: [...this.queue] });

        return;
    }

    /**
     * Toggles queue looping on or off.
     */
    public toggleLoopQueue() {
        return this.loopQueue = !this.loopQueue;
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
        return this.loopTrack = !this.loopTrack;
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
        this.player?.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }

        this.playing = false;
        this.queue = [];
        this.history = [];
        this.emit(MusicPlayerEvent.Disconnect);

        return;
    }

    /**
     * Stops playback and optionally disconnects.
     * @param noLeave - If true, stays connected to the channel.
     */
    public stop(noLeave = true) {
        this.radioMode = false;
        this.radioUrls = [];
        this.player.stop();
        this.playing = false;
        this.queue = [];
        this.history = [];
        this.clearIdleTimer();
        if (!noLeave) this.disconnect();

        this.emit(MusicPlayerEvent.Stop);

        return;
    }

    /**
     * Returns a copy of the current queue.
     * @returns Array of track metadata.
     */
    public getQueue() {
        return [...this.queue];
    }

    /**
     * Gets the current volume percentage.
     * @returns Volume (0–200).
     */
    public getVolume() {
        const resource = (this.player.state as AudioPlayerPlayingState).resource;
        if (resource && resource.volume && resource.volume.volume)
            return Math.round(resource.volume.volume * 100);

        return Math.round(this.volume * 100);
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
        return this.player && this.player.state.status === AudioPlayerStatus.Paused;
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
        const targetGuildId = guildId || this.connectionData?.guildId;
        if (!targetGuildId)
            return false;

        const connection = this.connection || getVoiceConnection(targetGuildId);
        if (!connection)
            return false;

        return [
            VoiceConnectionStatus.Ready,
            VoiceConnectionStatus.Connecting,
            VoiceConnectionStatus.Signalling
        ].includes(connection.state.status);
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
                this.name = "Discord-Player";
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