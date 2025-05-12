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

export class MusicPlayer extends EventEmitter<TypedEmitter> {
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

    constructor(
        private channel: VoiceChannel,
        initialVolume = 100,
        options: MusicPlayerOptions = {}
    ) {
        super();

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

    private clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
            return;
        }

        return;
    }

    private async ensureConnection() {
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
                this.connection.destroy();
                this.connection = null;
                this.emit(MusicPlayerEvent.Error, this.createError("Can't connect to the voice channel. => " + err.message));
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
        this.playing = true;
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
        if (!(this.player.state as AudioPlayerPlayingState).resource)
            (this.player.state as AudioPlayerPlayingState).resource = resource;

        this.emit(MusicPlayerEvent.Start, { url, history: [...this.history], metadata });
        return;
    }

    public async play(input: string) {
        await this.ensureConnection();
        const url = await this.search(input);
        const metadata = await this.fetchMetadata(url);

        if (this.playing) {
            this.queue.push(metadata);
            this.emit(MusicPlayerEvent.QueueAdd, { url, queue: [...this.queue] });
            return undefined;
        }

        else
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
        this.emit(MusicPlayerEvent.Finish, { history: [...this.history] });
        if (this.autoLeaveOnEmptyQueue) {
            this.emit(MusicPlayerEvent.Disconnect);
            this.disconnect();
            return;
        }

        else
            return this.startIdleTimer();

    }

    public skip() {
        this.emit(MusicPlayerEvent.Skip, { history: [...this.history] });
        this.player.stop();
    }

    public async previous() {
        if (this.history.length < 2) {
            this.emit(MusicPlayerEvent.Error, this.createError("No track to previous."));
            return;
        }

        this.emit(MusicPlayerEvent.Previous, { history: [...this.history] });
        this.queue.unshift(this.queue.find(a => a.url === this.history.pop())!);
        const prev = this.history.pop()!;

        const metadata = await this.fetchMetadata(prev);
        this.playUrl(prev, metadata);
    }

    public shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
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