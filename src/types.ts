export enum MusicPlayerEvent {
    Start = "start",
    QueueAdd = "queueAdd",
    Pause = "pause",
    Resume = "resume",
    Stop = "stop",
    Skip = "skip",
    Previous = "previous",
    Shuffle = "shuffle",
    LoopQueue = "loopQueue",
    LoopTrack = "loopTrack",
    VolumeChange = "volumeChange",
    Finish = "finish",
    Disconnect = "disconnect",
    Error = "error"
}


export interface StartPayload { metadata: TrackMetadata; queue: TrackMetadata[]; }
export interface QueueAddPayload { metadata: TrackMetadata; queue: TrackMetadata[] }
export interface VolumeChangePayload { volume: number }
export interface SkipPayload { queue: TrackMetadata[]; history: string[]; }
export interface PreviousPayload { metadata: TrackMetadata; queue: TrackMetadata[]; history: string[]; }
export interface ShufflePayload { queue: TrackMetadata[] }
export interface LoopTogglePayload { enabled: boolean }
export interface FinishPayload { queue: TrackMetadata[]; history: string[]; }

export type TypedEmitter = {
    "start": [StartPayload];
    "queueAdd": [QueueAddPayload];
    "pause": [void];
    "resume": [void];
    "stop": [void];
    "skip": [SkipPayload];
    "previous": [PreviousPayload];
    "shuffle": [ShufflePayload];
    "loopQueue": [LoopTogglePayload];
    "loopTrack": [LoopTogglePayload];
    "volumeChange": [VolumeChangePayload];
    "finish": [FinishPayload];
    "disconnect": [void];
    "error": [Error];

}

export interface VoiceChannel {
    id: string;
    guild: {
        id: string;
        voiceAdapterCreator: any;
    };
}

export interface TrackMetadata {
    title: string | undefined;
    author: string | undefined;
    duration: number | undefined; // seconds
    thumbnail: string | undefined;
    source: "youtube" | "soundcloud" | "spotify" | "deezer" | "unknown";
    url: string;
}
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */