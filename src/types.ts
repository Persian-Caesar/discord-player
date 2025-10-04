import {
    Manager,
    ManagerOptions,
    Payload
} from "erela.js";

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
export interface QueueAddPayload { metadata?: TrackMetadata; metadatas?: TrackMetadata[]; queue: TrackMetadata[] }
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

export interface PlaylistMetadata {
    title: string | undefined;
    trackCount: number;
    thumbnail: string | undefined;
    source: Source;
    url: string;
}

export interface TrackMetadata {
    title: string | undefined;
    author: string | undefined;
    duration: number | undefined; // seconds
    thumbnail: string | undefined;
    source: Source;
    url: string;
}

export type SearchPlatform = "youtube" | "spotify" | "soundcloud" | "deezer";

export type Source = "youtube" | "soundcloud" | "spotify" | "deezer" | "unknown";

export interface MusicPlayerOptions {
    initialVolume?: number;
    autoLeaveOnEmptyQueue?: boolean;
    autoLeaveOnIdleMs?: number;
    logError?: boolean;
    lavaLinkManager?: Manager,
    token?: TokenOptions
}

export interface TokenOptions {
    spotify?: {
        client_id: string;
        client_secret: string;
        refresh_token?: string;
        market?: string;
    };

    soundcloud?: {
        client_id: string;
    };

    youtube?: {
        cookie: string;
    };

    useragent?: string[];
}

export interface TextChannel {
    id: string;
}

export interface Client {
    user?: {
        id?: string;
    };
    once(event: "ready", listener: () => void): void;
    ws: {
        on(event: GatewayDispatchEvents, listener: (data: any) => void): void;
    };
    guilds: {
        cache: Map<string, Guild>;
        get(id: string): Guild | undefined;
    };
}

export interface Guild {
    id: string;
    shard: Shard;
}

export interface Shard {
    send(payload: Payload): void;
}

export type LavalinkManagerType = Manager;

export type LavalinkManagerOptions = Omit<ManagerOptions, "send"> & {
    send?: (id: string, payload: Payload) => void;
};

export enum GatewayDispatchEvents {
    VoiceServerUpdate = "VOICE_SERVER_UPDATE",
    VoiceStateUpdate = "VOICE_STATE_UPDATE"
}
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */