import { VoiceChannel, TypedEmitter, TrackMetadata } from "./types";
import EventEmitter from "events";
export interface MusicPlayerOptions {
    autoLeaveOnEmptyQueue?: boolean;
    autoLeaveOnIdleMs?: number;
}
export declare class MusicPlayer extends EventEmitter<TypedEmitter> {
    private channel;
    private connection;
    private player;
    private volume;
    private queue;
    private history;
    private loopQueue;
    private loopTrack;
    private playing;
    private autoLeaveOnEmptyQueue;
    private autoLeaveOnIdleMs;
    private idleTimer;
    constructor(channel: VoiceChannel, initialVolume?: number, options?: MusicPlayerOptions);
    private startIdleTimer;
    private clearIdleTimer;
    private ensureConnection;
    search(query: string): Promise<string>;
    private createStreamFromScdl;
    private createStreamFromYtdl;
    private createStreamFromPlayDl;
    private fetchMetadata;
    private playUrl;
    play(input: string): Promise<void>;
    pause(): void;
    resume(): void;
    setVolume(percent: number): void;
    private onIdle;
    skip(): void;
    previous(): Promise<void>;
    shuffle(): void;
    toggleLoopQueue(): void;
    isLoopQueue(): boolean;
    toggleLoopTrack(): void;
    isLoopTrack(): boolean;
    disconnect(): void;
    stop(noLeave?: boolean): void;
    getQueue(): TrackMetadata[];
    getVolume(): number;
    isPlaying(): boolean;
    private createError;
}
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */ 
