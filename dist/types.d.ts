export declare enum MusicPlayerEvent {
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
export interface StartPayload {
    url: string;
    history: string[];
}
export interface QueueAddPayload {
    url: string;
    queue: string[];
}
export interface VolumeChangePayload {
    volume: number;
}
export interface SkipPayload {
    history: string[];
}
export interface PreviousPayload {
    history: string[];
}
export interface ShufflePayload {
    queue: string[];
}
export interface LoopTogglePayload {
    enabled: boolean;
}
export interface FinishPayload {
    history: string[];
}
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
};
export interface VoiceChannel {
    id: string;
    guild: {
        id: string;
        voiceAdapterCreator: any;
    };
}
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */ 
