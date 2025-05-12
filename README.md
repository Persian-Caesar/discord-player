# discord-player
Discord music player.


## Introduction

This repository provides a fully-typed `MusicPlayer` class for Discord self-bots, along with a strongly-typed event system using an `enum`. You get:

* A single `MusicPlayer.ts` implementation that extends `EventEmitter` and emits fixed, well-typed events
* A `src/types.ts` file defining `MusicPlayerEvent` (as an `enum`), the payload interfaces for each event, and a `TypedEmitter` interface for full type-safety

You can install, import, and start listening to player events in seconds, without touching raw channel messaging.

---

## Installation

```bash
npm install --save @persian-caesar/discord-player
```

> **Note:**
> This package provides the player and its types. You still need to install the actual playback libraries as peer dependencies:

```bash
npm install @discordjs/voice ytdl-core-discord ytdl-core play-dl @distube/ytdl-core soundcloud-downloader ffmpeg-static @discordjs/opus libsodium-wrappers
```

---

## Quick Start (TypeScript)

```ts
import { MusicPlayer, MusicPlayerEvent } from "@persian-caesar/discord-player";
import type { VoiceChannel } from "@persian-caesar/discord-player";

// Assume you already have a VoiceChannel object:
const voiceChannel: VoiceChannel = /* your voice channel instance */;

const player = new MusicPlayer(voiceChannel, 50, {
  autoLeaveOnEmptyQueue: true,
  autoLeaveOnIdleMs: 300_000,
});

// Listen for events
player.on(MusicPlayerEvent.Start, ({ url, history, metadata }) => {
  console.log(`▶️ Now playing: ${url}`);
});

player.on(MusicPlayerEvent.QueueAdd, ({ url, queue }) => {
  console.log(`➕ Added to queue: ${url} (queue length: ${queue.length})`);
});

player.on(MusicPlayerEvent.Finish, ({ history }) => {
  console.log("⏹️ Playback finished.");
});

player.on(MusicPlayerEvent.Error, (error) => {
  console.error("❌ Player error:", error.message);
});

// Start playing
await player.play("https://youtu.be/dQw4w9WgXcQ");
```

---


## Quick Start (JavaScript)

```ts
// @persian-caesar/discord-player ships with JSDoc types, so plain JS works too:
const { MusicPlayer, MusicPlayerEvent } = require("@persian-caesar/discord-player");

/**
 * @type {import("@persian-caesar/discord-player").VoiceChannel}
 */
const voiceChannel = /* your voice channel instance */;

const player = new MusicPlayer(voiceChannel, 50, {
  autoLeaveOnEmptyQueue: true,
  autoLeaveOnIdleMs: 300_000,
});

player.on(MusicPlayerEvent.Start, ({ url, history, metadata }) => {
  console.log("▶️ Now playing:", url);
});

player.play("https://youtu.be/dQw4w9WgXcQ");
```

---

## API Reference

### `class MusicPlayer`

#### Constructor

```ts
new MusicPlayer(
  channel: VoiceChannel,
  initialVolume?: number,        // default: 100 => 100%
  options?: MusicPlayerOptions,  // { autoLeaveOnEmptyQueue?: boolean, autoLeaveOnIdleMs?: number }
)
```

* `autoLeaveOnEmptyQueue` (default `true`): automatically disconnect when queue ends
* `autoLeaveOnIdleMs` (default `5 * 60_000` ms): time before auto-disconnect on idle

#### Methods

| Method                       | Description                               |
| ---------------------------- | ----------------------------------------- |
| `play(input: string)`        | Search & play or enqueue a track          |
| `pause()`                    | Pause playback                            |
| `resume()`                   | Resume playback                           |
| `setVolume(percent: number)` | Set volume (0–200%)                       |
| `skip()`                     | Skip current track                        |
| `previous()`                 | Go back to previous track                 |
| `shuffle()`                  | Shuffle the queue                         |
| `toggleLoopQueue()`          | Toggle queue repeat                       |
| `toggleLoopTrack()`          | Toggle single-track repeat                |
| `stop(disconnect?: boolean)` | Stop playback (and optionally disconnect) |
| `disconnect()`               | Force disconnect immediately              |
| `getQueue(): string[]`       | Get copy of current queue URLs            |
| `getVolume(): number`        | Get current volume as percentage          |

---

### `enum MusicPlayerEvent`

```ts
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
  Error = "error",
}
```

Each event emits a strongly-typed payload:

```ts
// examples of payload shapes
Start         → { url: string; history: string[]; metadata: TrackMetadata; }
QueueAdd      → { url: string; queue: TrackMetadata[] }
Pause/Resume  → no payload
VolumeChange  → { volume: number }
Skip/Previous → { history: string[] }
Shuffle       → { queue: TrackMetadata[] }
LoopQueue/Track → { enabled: boolean }
Finish        → { history: string[] }
Disconnect    → no payload
Error         → Error instance
```

For full payload definitions, see `src/types.ts`.

---

## Documentation & Support

* **Repository**: [https://github.com/Persian-Caesar/discord-player](https://github.com/Persian-Caesar/discord-player)
* **Issues**: [https://github.com/Persian-Caesar/discord-player/issues](https://github.com/Persian-Caesar/discord-player/issues)
* **License**: MIT

---

⌨️ Built with ❤️ by **Persian-Caesar**. Don’t forget to ⭐️ the repo!



## Contact
<div align="center">
  <a href="https://srza.ir" target="_blank">
   <img align="left" src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/social.png" alt="Sobhan-SRZA social" width=400px>
  </a>

  <a href="https://t.me/d_opa_mine" target="_blank">
   <img alt="Telegram"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/telegram-ch.svg"
    height="30" />
  </a>

  <a href="https://t.me/Sobhan_SRZA" target="_blank">
   <img alt="Telegram"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/telegram-ac.svg"
    height="30" />
  </a>

  <a href="https://www.instagram.com/mr.sinre?igsh=cWk1aHdhaGRnOGg%3D&utm_source=qr" target="_blank">
   <img alt="Instagram"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/instagram.svg"
    height="30" />
  </a>

  <a href="https://www.twitch.tv/sobhan_srza" target="_blank">
   <img alt="Twitch"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/twitch.svg"
    height="30" />
  </a>

  <a href="https://www.youtube.com/@mr_sinre?app=desktop&sub_confirmation=1" target="_blank">
   <img alt="YouTube"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/youtube.svg"
    height="30" />
  </a>
  
  <a href="https://github.com/Sobhan-SRZA" target="_blank">
   <img alt="Github"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/github.svg"
    height="30" />
  </a>
  
  <p align="left">
   <a href="https://discord.gg/xh2S2h67UW" target="_blank">
    <img src="https://discord.com/api/guilds/1054814674979409940/widget.png?style=banner2" alt="pc-development.png">
   </a>
  </p>

  <p align="right">
   <a href="https://discord.gg/54zDNTAymF" target="_blank">
    <img src="https://discord.com/api/guilds/1181764925874507836/widget.png?style=banner2" alt="pc-club.png">
   </a>
  </p>

  <div align="center">
   <a href="https://discord.com/users/865630940361785345" target="_blank">
    <img alt="My Discord Account" src="https://discord.c99.nl/widget/theme-1/865630940361785345.png" />
   </a>
    <a href="https://discord.com/users/986314682547716117" target="_blank" align="right">
    <img alt="Team Discord Account" src="https://discord.c99.nl/widget/theme-1/986314682547716117.png" />
   </a>
  </div>

 </div>

</div>