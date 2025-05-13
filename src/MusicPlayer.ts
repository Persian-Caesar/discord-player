import {
    joinVoiceChannel,
    VoiceConnection,
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
    AudioPlayerPlayingState
} from "@discordjs/voice";
import {
    VoiceChannel,
    TypedEmitter,
    MusicPlayerEvent,
    TrackMetadata
} from "./types";
import { htmlToText } from "html-to-text";
import type { Stream } from "stream";
import ytdl_core_discord from "ytdl-core-discord";
import EventEmitter from "events";
import ytdl_core from "ytdl-core";
import playdl from "play-dl";
import ytdl from "@distube/ytdl-core";
import scdl from "soundcloud-downloader";

export interface MusicPlayerOptions {
    autoLeaveOnEmptyQueue?: boolean;
    autoLeaveOnIdleMs?: number;
}

/**
 * MusicPlayer
 *  - Manages voice connection, playback, queue, history, and loop modes
 *  - Emits events defined in MusicPlayerEvent
 */
export class MusicPlayer extends EventEmitter<TypedEmitter> {
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

    /**
     * @param channel   The Discord voice channel to connect to
     * @param initialVolume  Initial volume in percent (0–100)
     * @param options   Configuration options (auto-leave, idle timeout)
     */
    constructor(
        public channel: VoiceChannel,
        initialVolume = 100,
        options: MusicPlayerOptions = {}
    ) {
        super();

        // create the audio player and set volume
        this.player = createAudioPlayer();
        this.volume = Math.round(initialVolume / 100);

        this.autoLeaveOnEmptyQueue = options.autoLeaveOnEmptyQueue ?? true;
        this.autoLeaveOnIdleMs = options.autoLeaveOnIdleMs ?? 5 * 60_000;

        this.player.on("error", err => {
            this.emit(MusicPlayerEvent.Error, this.createError("Player have error => " + err.message));
        });
        this.player.on(AudioPlayerStatus.Idle, () => this.onIdle());
        this.player.on(AudioPlayerStatus.Playing, () => this.clearIdleTimer());
    }

    private startIdleTimer() {
        if (this.autoLeaveOnIdleMs > 0 && !this.idleTimer && !this.playing) {
            this.idleTimer = setTimeout(() => {
                this.emit(MusicPlayerEvent.Disconnect);
                this.disconnect();
            }, this.autoLeaveOnIdleMs);
            return;
        }

        return;
    }

    /**
     * Search Google and scrape lyrics snippets.
     * Returns the lyrics or null if not found.
     *
     * @param title   Song title
     * @param artist  Optional artist name, for more accurate search
     */
    public async searchLyrics(title: string, artist?: string): Promise<string | null> {
        const delim1 = '</div></div></div></div><div class="hwc"><div class="BNeawe tAd8D AP7Wnd"><div><div class="BNeawe tAd8D AP7Wnd">';
        const delim2 = '</div></div></div></div></div><div><span class="hwc"><div class="BNeawe uEec3 AP7Wnd">';
        const GOOGLE = "https://www.google.com/search?q=";
        let html: string = "";
        const query = encodeURIComponent(`${artist ? artist + " " : ""}${title}`);

        // build multiple query URLs with different suffixes    
        const attempts = [
            `${GOOGLE}${query}+lyrics`,
            `${GOOGLE}${query}+song+lyrics`,
            `${GOOGLE}${query}+song`,
            `${GOOGLE}${query}`
        ];

        for (const url of attempts) {
            try {
                // fetch HTML, split by known delimiters, then strip tags
                const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
                html = await res.text();
                break;
            } catch {
                continue;
            }
        }

        if (!html) return null;

        let snippet: string;
        try {
            [, snippet] = html.split(delim1);
            [snippet] = snippet.split(delim2);
        } catch {
            return null;
        }

        const rawLines = snippet.split("\n");
        let lyrics = "";
        for (const line of rawLines) {
            lyrics += htmlToText(line).trim() + "\n";
        }

        // lyrics = Buffer.from(lyrics, "binary").toString("utf8").trim();
        lyrics = lyrics.trim();

        return lyrics || null;
    }


    private clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
            return;
        }

        return;
    }

    /**
     * Connect to the voice channel if not already connected.
     * Waits until the connection is READY or emits an error.
     */
    private async ensureConnection() {
        // joinVoiceChannel will handle reconnection automatically
        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: this.channel.id,
                guildId: this.channel.guild.id,
                adapterCreator: this.channel.guild.voiceAdapterCreator
            });
            try {
                await entersState(
                    this.connection,
                    VoiceConnectionStatus.Ready,
                    20_000
                );
                this.connection.subscribe(this.player);
            } catch (err: any) {
                // clean up on failure
                this.connection.destroy();
                this.connection = null;
                this.emit(MusicPlayerEvent.Error,
                    this.createError("Can't connect to the voice channel. => " + err.message)
                );
            }
        }
    }

    public async search(query: string): Promise<string> {
        if (/^https?:\/\//.test(query)) return query;

        // soundcloud
        const sc_results = await scdl.search({
            query,
            resourceType: "tracks",
            limit: 1
        });
        let url = sc_results.collection?.[0]?.permalink_url;
        if (!url) {
            // spotify youtube and also soundcloud
            const playdl_results = await playdl.search(query, {
                limit: 1,
                source: {
                    spotify: "track",
                    soundcloud: "tracks",
                    youtube: "video",
                    deezer: "track"
                }
            });
            url = playdl_results[0]?.url;
        }

        return url;
    }

    private async createStreamFromScdl(url: string): Promise<Stream.Readable> {
        return await scdl.download(url);
    }

    private async createStreamFromYtdl(url: string): Promise<Stream.Readable | null> {
        const options: any = { filter: "audioonly", highWaterMark: 1 << 25 };
        let stream: Stream.Readable | null = null;
        try { stream = await ytdl(url, options); } catch { };

        if (!stream)
            try { stream = await ytdl_core(url, options); } catch { };

        if (!stream)
            try { stream = await ytdl_core_discord(url, options); } catch { }

        return stream;
    }

    private async createStreamFromPlayDl(url: string): Promise<Stream.Readable | null> {
        const yt = await playdl.stream(url, { quality: 2 });
        if (!yt)
            return null;

        return yt.stream;
    }

    private async fetchMetadata(url: string): Promise<TrackMetadata> {
        try {
            // YouTube
            if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
                let info: ytdl.videoInfo | ytdl_core.videoInfo | undefined;
                try { info = await ytdl.getBasicInfo(url); } catch { };

                if (!info)
                    try { info = await ytdl_core.getBasicInfo(url); } catch { };

                if (!info)
                    try { info = await ytdl_core_discord.getBasicInfo(url); } catch { }

                if (!info)
                    return {
                        title: undefined,
                        author: undefined,
                        duration: undefined,
                        thumbnail: undefined,
                        source: "unknown",
                        url
                    };

                const details = info.videoDetails;
                return {
                    title: details.title,
                    author: details.author.name,
                    duration: parseInt(details.lengthSeconds, 10),
                    thumbnail: details.thumbnails[details.thumbnails.length - 1].url,
                    source: "youtube",
                    url
                };
            }

            // SoundCloud
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

            // Other sources can be added similarly with playdl
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
        } catch {
            return {
                title: undefined,
                author: undefined,
                duration: undefined,
                thumbnail: undefined,
                source: "unknown",
                url
            };
        }
    }

    private async playUrl(url: string, metadata: TrackMetadata) {
        this.history.push(url);

        // Create audio stream as before
        let stream: Stream.Readable | null = null;
        if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url))
            try { stream = await this.createStreamFromScdl(url); } catch { };

        if (/^https?:\/\/open\.spotify\.com\/(track|album|playlist)\//.test(url))
            if (!stream)
                try { stream = await this.createStreamFromPlayDl(url); } catch { };

        if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url))
            if (!stream)
                try { stream = await this.createStreamFromYtdl(url); } catch { };

        const resource = createAudioResource(stream!, { inlineVolume: true });
        resource.volume?.setVolume(this.volume);
        this.player.play(resource);
        this.playing = true;

        this.emit(MusicPlayerEvent.Start, {
            metadata,
            queue: [...this.queue]
        });

        if (!(this.player.state as AudioPlayerPlayingState).resource)
            (this.player.state as AudioPlayerPlayingState).resource = resource;

        return;
    }

    /**
     * Play a song by query or URL.
     * If already playing, adds to queue and emits a queueAdd event.
     * Otherwise, starts immediate playback via playUrl().
     *
     * @param input  YouTube URL or search query (e.g. “Coldplay Yellow”)
     */
    public async play(input: string) {
        await this.ensureConnection();

        // resolve to a URL, then fetch metadata
        const url = await this.search(input);
        const metadata = await this.fetchMetadata(url);

        if (this.playing) {
            // enqueue and notify
            this.queue.push(metadata);
            this.emit(MusicPlayerEvent.QueueAdd, {
                metadata,
                queue: [...this.queue]
            });
            return;
        }

        else
            // start playback immediately
            return await this.playUrl(url, metadata);

    }

    public pause() {
        this.player.pause();
        this.emit(MusicPlayerEvent.Pause);
    }

    public resume() {
        this.player.unpause();
        this.emit(MusicPlayerEvent.Resume);
    }

    public setVolume(percent: number) {
        percent /= 100;
        if (percent < 0 || percent > 2)
            this.volume = 2;

        else
            this.volume = percent;

        const resource = (this.player.state as AudioPlayerPlayingState).resource;
        try {
            resource.volume!.setVolume(this.volume);
        } catch { }

        this.emit(MusicPlayerEvent.VolumeChange, { volume: Math.round(this.volume * 100) });
    }

    /**
     * Handle when the player becomes idle.
     * - If loopTrack is on, replay current track
     * - Else if queue has items, play next
     * - Otherwise, emit finish and optionally disconnect
     */
    private async onIdle() {
        const url = this.history[this.history.length - 1];
        const metadata = await this.fetchMetadata(url);
        if (this.loopTrack)
            return await this.playUrl(url, metadata);

        if (this.queue.length) {
            const next = this.queue.shift()!;
            if (this.loopQueue) this.queue.push(next);

            const metadata = await this.fetchMetadata(next.url);
            return await this.playUrl(next.url, metadata);
        }

        this.playing = false;
        this.emit(MusicPlayerEvent.Finish, {
            queue: [...this.queue],
            history: [...this.history]
        });
        if (this.autoLeaveOnEmptyQueue) {
            this.emit(MusicPlayerEvent.Disconnect);
            this.disconnect();
            return;
        }

        else
            return this.startIdleTimer();

    }

    public skip() {
        this.emit(MusicPlayerEvent.Skip, { queue: [...this.queue], history: [...this.history] });
        this.player.stop();
    }

    /**
     * Jump to the previous track.
     * Pops current and last URLs from history, re-queues the current,
     * and starts playback of the previous one.
     */
    public async previous() {
        if (this.history.length < 2) {
            this.emit(MusicPlayerEvent.Error, this.createError("No track to previous."));
            return;
        }

        // Remove current URL
        this.history.pop();

        // Get the one before it
        const prevUrl = this.history.pop()!;
        const metadata = await this.fetchMetadata(prevUrl);

        // Re-insert into the front of the queue
        this.queue.unshift(metadata);

        // Notify listeners with updated state
        this.emit(MusicPlayerEvent.Previous, {
            metadata,
            queue: [...this.queue],
            history: [...this.history, prevUrl]
        });

        // Play the previous track
        await this.playUrl(prevUrl, metadata);
        return;
    }

    /**
     * Shuffle the queue randomly.
     * Saves the current queue order so you can undo.
     */
    public shuffle() {
        // Backup before shuffle
        this.previousQueueOrder = [...this.queue];
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }

        this.shuffield = true;
        this.emit(MusicPlayerEvent.Shuffle, {
            queue: [...this.queue]
        });
    }

    /**
     * Restore the queue to its previous order,
     * excluding any tracks that have already been played.
     */
    public undoShuffle() {
        // Filter out URLs already in history
        this.queue = this.previousQueueOrder.filter(
            meta => !this.history.includes(meta.url)
        );

        this.shuffield = false;
        this.emit(MusicPlayerEvent.Shuffle, {
            queue: [...this.queue]
        });
    }

    public toggleLoopQueue() {
        this.loopQueue = !this.loopQueue;
    }
    public isLoopQueue() {
        return this.loopQueue;
    }

    public toggleLoopTrack() {
        this.loopTrack = !this.loopTrack;
    }
    public isLoopTrack() {
        return this.loopTrack;
    }

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
    }

    public stop(noLeave = true) {
        this.emit(MusicPlayerEvent.Stop);
        this.player.stop();
        this.playing = false;
        this.queue = [];
        this.history = [];
        this.clearIdleTimer();
        if (!noLeave)
            this.disconnect();

        return;
    }

    public getQueue() {
        return [...this.queue];
    }

    public getVolume() {
        const resource = (this.player.state as AudioPlayerPlayingState).resource;
        if (resource && resource.volume && resource.volume.volume)
            return Math.round(
                resource.volume.volume * 100
            );

        return Math.round(
            this.volume * 100
        );
    }

    public isPlaying(): boolean {
        return this.playing;
    }

    public isPaused(): boolean {
        return this.player && this.player.state.status === AudioPlayerStatus.Paused;
    }

    public isShuffiled(): boolean {
        return this.shuffield;
    }

    // Custom error class
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