# @persian-caesar/discord-player

A lightweight, type-safe music player for Discord self-bots, built with TypeScript and integrated with `discord.js`. This package provides a robust `MusicPlayer` class for streaming audio from platforms like YouTube, SoundCloud, Spotify, and Deezer, with features like queue management, looping, shuffling, and lyrics retrieval.

## Table of Contents
- [@persian-caesar/discord-player](#persian-caesardiscord-player)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Features](#features)
  - [Installation](#installation)
  - [Dependencies](#dependencies)
  - [Usage Examples](#usage-examples)
    - [TypeScript Example](#typescript-example)
    - [JavaScript Example](#javascript-example)
  - [API Reference](#api-reference)
    - [MusicPlayer Class](#musicplayer-class)
    - [MusicPlayerEvent Enum](#musicplayerevent-enum)
    - [Method Usage and Examples](#method-usage-and-examples)
      - [`play(input: string): Promise<void>`](#playinput-string-promisevoid)
      - [`pause(): void`](#pause-void)
      - [`resume(): void`](#resume-void)
      - [`setVolume(percent: number): void`](#setvolumepercent-number-void)
      - [`skip(): void`](#skip-void)
      - [`previous(): Promise<void>`](#previous-promisevoid)
      - [`shuffle(): void`](#shuffle-void)
      - [`undoShuffle(): void`](#undoshuffle-void)
      - [`toggleLoopQueue(): void`](#toggleloopqueue-void)
      - [`toggleLoopTrack(): void`](#togglelooptrack-void)
      - [`startRadio(urls: string[]): Promise<void>`](#startradiourls-string-promisevoid)
      - [`stop(noLeave?: boolean): void`](#stopnoleave-boolean-void)
      - [`disconnect(): void`](#disconnect-void)
      - [`getQueue(): TrackMetadata[]`](#getqueue-trackmetadata)
      - [`getVolume(): number`](#getvolume-number)
      - [`isPlaying(): boolean`](#isplaying-boolean)
      - [`isPaused(): boolean`](#ispaused-boolean)
      - [`isShuffiled(): boolean`](#isshuffiled-boolean)
      - [`searchLyrics(title: string, artist?: string): Promise<string | null>`](#searchlyricstitle-string-artist-string-promisestring--null)
  - [Support and Contributions](#support-and-contributions)
  - [License](#license)
  - [Contact](#contact)

## Introduction
`@persian-caesar/discord-player` is designed to simplify audio playback in Discord bots. It leverages the `@discordjs/voice` library for voice channel interactions and supports streaming from multiple platforms using libraries like `ytdl-core`, `play-dl`, and `soundcloud-downloader`. The package is fully typed, making it ideal for TypeScript projects, and includes JSDoc annotations for JavaScript users. The `MusicPlayer` class handles all aspects of music playback, including queue management, history tracking, and event-driven notifications.

Developed by [Sobhan-SRZA](https://github.com/Sobhan-SRZA) for [Persian Caesar](https://github.com/Persian-Caesar), this package is licensed under MIT and actively maintained.

## Features
- **Multi-Platform Streaming**: Supports YouTube, SoundCloud, Spotify, and Deezer via `ytdl-core`, `play-dl`, and `soundcloud-downloader`.
- **Queue Management**: Add tracks to a queue, shuffle, or revert to the original order.
- **Looping Options**: Toggle looping for a single track or the entire queue.
- **Volume Control**: Adjust playback volume (0–200%).
- **Lyrics Retrieval**: Fetch song lyrics from Google search results using `html-to-text`.
- **Radio Mode**: Play a shuffled list of URLs in a continuous loop.
- **Event System**: Strongly-typed events for playback status, queue changes, errors, and more.
- **Auto-Disconnect**: Configurable options to leave voice channels when the queue is empty or after idle time.
- **Type Safety**: Full TypeScript support with defined interfaces and enums in `types.ts`.
- **Lightweight**: Minimal dependencies with no external framework requirements beyond `discord.js`.

## Installation
Install the package:

```bash
npm install @persian-caesar/discord-player
```

Ensure you have Node.js version 16 or higher, as specified in `package.json`.

## Dependencies
The following dependencies are required for the package to function correctly:

| Package                 | Version  | Purpose                                                                   |
| ----------------------- | -------- | ------------------------------------------------------------------------- |
| `@discordjs/voice`      | ^0.18.0  | Handles voice channel connections and audio playback in Discord.          |
| `@discordjs/opus`       | ^0.10.0  | Provides Opus audio encoding/decoding for high-quality audio streaming.   |
| `ytdl-core`             | ^4.11.5  | Streams audio from YouTube videos, with fallback support for reliability. |
| `ytdl-core-discord`     | ^1.3.1   | Alternative YouTube streaming library for compatibility.                  |
| `@distube/ytdl-core`    | ^4.16.10 | Enhanced YouTube streaming with additional features and reliability.      |
| `play-dl`               | ^1.9.7   | Streams audio from Spotify, YouTube, and Deezer with search capabilities. |
| `soundcloud-downloader` | ^1.0.0   | Downloads and streams audio from SoundCloud URLs.                         |
| `html-to-text`          | ^9.0.5   | Converts HTML (from Google lyrics searches) to plain text.                |
| `libsodium-wrappers`    | ^0.7.15  | Required for secure audio encryption in `@discordjs/voice`.               |
| `ffmpeg-static`         | (peer)   | Provides FFmpeg for audio processing and stream conversion.               |

**Why these dependencies?**
- `@discordjs/voice` and `@discordjs/opus` are core to Discord voice functionality, enabling the bot to join channels and stream audio.
- Multiple YouTube streaming libraries (`ytdl-core`, `ytdl-core-discord`, `@distube/ytdl-core`) ensure robust streaming with fallbacks for reliability.
- `play-dl` adds support for Spotify and Deezer, broadening the range of supported platforms.
- `soundcloud-downloader` enables streaming from SoundCloud, a popular music platform.
- `html-to-text` is used for scraping and cleaning lyrics from Google search results.
- `libsodium-wrappers` and `ffmpeg-static` are required for secure and efficient audio processing.

## Usage Examples
Below are two examples demonstrating how to integrate `@persian-caesar/discord-player` with `discord.js` in both TypeScript and JavaScript. These examples assume you have a Discord bot set up with `discord.js`.

### TypeScript Example
This example shows how to create a Discord bot that uses `MusicPlayer` to play music in a voice channel and handle commands.

```typescript
import { Client, GatewayIntentBits, TextChannel, VoiceChannel } from 'discord.js';
import { MusicPlayer, MusicPlayerEvent } from '@persian-caesar/discord-player';

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot configuration
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // Replace with your bot token

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  const voiceChannel = message.member.voice.channel as VoiceChannel;
  const player = new MusicPlayer(voiceChannel, 50, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 minutes
  });

  // Event listeners for music player
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ Added to queue: ${metadata.title || metadata.url} (${queue.length} in queue)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ Error: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ Playback finished.');
  });

  // Command handling
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('Please provide a URL or search query.');
      return;
    }
    await player.play(query);
  } else if (command === 'pause') {
    player.pause();
    message.channel.send('⏸️ Paused playback.');
  } else if (command === 'resume') {
    player.resume();
    message.channel.send('▶️ Resumed playback.');
  } else if (command === 'skip') {
    player.skip();
    message.channel.send('⏭️ Skipped to next track.');
  } else if (command === 'stop') {
    player.stop();
    message.channel.send('⏹️ Stopped playback.');
  } else if (command === 'lyrics') {
    const title = args.join(' ');
    if (!title) {
      message.channel.send('Please provide a song title.');
      return;
    }
    const lyrics = await player.searchLyrics(title);
    message.channel.send(lyrics ? `🎵 Lyrics:\n${lyrics}` : '❌ No lyrics found.');
  }
});

client.login(TOKEN);
```

**Steps to run:**
1. Save the above code as `bot.ts`.
2. Replace `YOUR_BOT_TOKEN` with your Discord bot token.
3. Ensure all dependencies are installed.
4. Compile with `tsc bot.ts` and run with `node bot.js`.

### JavaScript Example
This example is similar but uses plain JavaScript with JSDoc annotations for type hints.

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { MusicPlayer, MusicPlayerEvent } = require('@persian-caesar/discord-player');

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot configuration
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // Replace with your bot token

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  /** @type {import('@persian-caesar/discord-player').VoiceChannel} */
  const voiceChannel = message.member.voice.channel;
  const player = new MusicPlayer(voiceChannel, 50, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 minutes
  });

  // Event listeners for music player
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ Added to queue: ${metadata.title || metadata.url} (${queue.length} in queue)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ Error: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ Playback finished.');
  });

  // Command handling
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('Please provide a URL or search query.');
      return;
    }
    await player.play(query);
  } else if (command === 'pause') {
    player.pause();
    message.channel.send('⏸️ Paused playback.');
  } else if (command === 'resume') {
    player.resume();
    message.channel.send('▶️ Resumed playback.');
  } else if (command === 'skip') {
    player.skip();
    message.channel.send('⏭️ Skipped to next track.');
  } else if (command === 'stop') {
    player.stop();
    message.channel.send('⏹️ Stopped playback.');
  } else if (command === 'lyrics') {
    const title = args.join(' ');
    if (!title) {
      message.channel.send('Please provide a song title.');
      return;
    }
    const lyrics = await player.searchLyrics(title);
    message.channel.send(lyrics ? `🎵 Lyrics:\n${lyrics}` : '❌ No lyrics found.');
  }
});

client.login(TOKEN);
```

**Steps to run:**
1. Save the above code as `bot.js`.
2. Replace `YOUR_BOT_TOKEN` with your Discord bot token.
3. Ensure all dependencies are installed.
4. Run with `node bot.js`.

## API Reference

### MusicPlayer Class
**Constructor**:
```typescript
new MusicPlayer(
  channel: VoiceChannel,
  initialVolume?: number, // Default: 100
  options?: MusicPlayerOptions // { autoLeaveOnEmptyQueue?: boolean, autoLeaveOnIdleMs?: number }
)
```

**Methods**:
| Method                                         | Description                                                |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `play(input: string)`                          | Plays a track by URL or search query, enqueues if playing. |
| `pause()`                                      | Pauses the current track.                                  |
| `resume()`                                     | Resumes playback.                                          |
| `setVolume(percent: number)`                   | Sets volume (0–200%).                                      |
| `skip()`                                       | Skips to the next track in the queue.                      |
| `previous()`                                   | Plays the previous track from history.                     |
| `shuffle()`                                    | Shuffles the queue, saving the original order.             |
| `undoShuffle()`                                | Restores the queue to its pre-shuffle order.               |
| `toggleLoopQueue()`                            | Toggles queue looping.                                     |
| `toggleLoopTrack()`                            | Toggles single-track looping.                              |
| `startRadio(urls: string[])`                   | Starts radio mode with shuffled URLs.                      |
| `stop(noLeave?: boolean)`                      | Stops playback, optionally disconnects.                    |
| `disconnect()`                                 | Disconnects from the voice channel.                        |
| `getQueue(): TrackMetadata[]`                  | Returns a copy of the current queue.                       |
| `getVolume(): number`                          | Returns the current volume (0–200%).                       |
| `isPlaying(): boolean`                         | Checks if a track is playing.                              |
| `isPaused(): boolean`                          | Checks if playback is paused.                              |
| `isShuffiled(): boolean`                       | Checks if the queue is shuffled.                           |
| `searchLyrics(title: string, artist?: string)` | Fetches song lyrics from Google.                           |

### MusicPlayerEvent Enum
```typescript
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
```

**Event Payloads**:
- `Start`: `{ metadata: TrackMetadata, queue: TrackMetadata[] }`
- `QueueAdd`: `{ metadata: TrackMetadata, queue: TrackMetadata[] }`
- `VolumeChange`: `{ volume: number }`
- `Skip`: `{ queue: TrackMetadata[], history: string[] }`
- `Previous`: `{ metadata: TrackMetadata, queue: TrackMetadata[], history: string[] }`
- `Shuffle`: `{ queue: TrackMetadata[] }`
- `Finish`: `{ queue: TrackMetadata[], history: string[] }`
- `Error`: `Error`
- Others: No payload

See `types.ts` for full type definitions.

### Method Usage and Examples
This section provides detailed explanations and code snippets for each `MusicPlayer` method, demonstrating their usage within a Discord bot context using `discord.js`. The examples assume a `MusicPlayer` instance is created as shown in the [Usage Examples](#usage-examples) section.

#### `play(input: string): Promise<void>`
Plays a track by URL or search query. If a track is already playing, it adds the new track to the queue.

**Example**:
```typescript
// Command: !play <query>
if (command === 'play') {
  const query = args.join(' ');
  if (!query) {
    message.channel.send('Please provide a URL or search query.');
    return;
  }
  await player.play(query);
  // The Start or QueueAdd event will handle the response
}
player.on(MusicPlayerEvent.Start, ({ metadata }) => {
  message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
});
player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
  message.channel.send(`➕ Added to queue: ${metadata.title || metadata.url} (${queue.length} in queue)`);
});
```

#### `pause(): void`
Pauses the currently playing track.

**Example**:
```typescript
if (command === 'pause') {
  player.pause();
  message.channel.send('⏸️ Playback paused.');
}
player.on(MusicPlayerEvent.Pause, () => {
  message.channel.send('⏸️ Playback paused.');
});
```

#### `resume(): void`
Resumes playback of a paused track.

**Example**:
```typescript
if (command === 'resume') {
  player.resume();
  message.channel.send('▶️ Playback resumed.');
}
player.on(MusicPlayerEvent.Resume, () => {
  message.channel.send('▶️ Playback resumed.');
});
```

#### `setVolume(percent: number): void`
Sets the playback volume (0–200%). Values outside this range are capped at 200%.

**Example**:
```typescript
if (command === 'volume') {
  const volume = parseInt(args[0]);
  if (isNaN(volume)) {
    message.channel.send('Please provide a valid volume (0–200).');
    return;
  }
  player.setVolume(volume);
  // The VolumeChange event will handle the response
}
player.on(MusicPlayerEvent.VolumeChange, ({ volume }) => {
  message.channel.send(`🔊 Volume set to ${volume}%`);
});
```

#### `skip(): void`
Skips the current track and plays the next track in the queue.

**Example**:
```typescript
if (command === 'skip') {
  player.skip();
  message.channel.send('⏭️ Skipped to next track.');
}
player.on(MusicPlayerEvent.Skip, ({ queue }) => {
  message.channel.send(`⏭️ Skipped. ${queue.length} tracks remaining in queue.`);
});
```

#### `previous(): Promise<void>`
Plays the previous track from the history, if available.

**Example**:
```typescript
if (command === 'previous') {
  await player.previous();
  // The Previous event will handle the response
}
player.on(MusicPlayerEvent.Previous, ({ metadata }) => {
  message.channel.send(`⏮️ Playing previous track: ${metadata.title || metadata.url}`);
});
player.on(MusicPlayerEvent.Error, (error) => {
  if (error.message.includes('No track to previous')) {
    message.channel.send('❌ No previous track available.');
  }
});
```

#### `shuffle(): void`
Shuffles the queue and saves the original order for potential restoration.

**Example**:
```typescript
if (command === 'shuffle') {
  player.shuffle();
  message.channel.send('🔀 Queue shuffled.');
}
player.on(MusicPlayerEvent.Shuffle, ({ queue }) => {
  message.channel.send(`🔀 Queue shuffled. ${queue.length} tracks in new order.`);
});
```

#### `undoShuffle(): void`
Restores the queue to its pre-shuffle order, excluding played tracks.

**Example**:
```typescript
if (command === 'unshuffle') {
  player.undoShuffle();
  message.channel.send('🔄 Queue restored to original order.');
}
player.on(MusicPlayerEvent.Shuffle, ({ queue }) => {
  message.channel.send(`🔄 Queue restored. ${queue.length} tracks in queue.`);
});
```

#### `toggleLoopQueue(): void`
Toggles queue looping on or off.

**Example**:
```typescript
if (command === 'loopqueue') {
  player.toggleLoopQueue();
  message.channel.send(`🔁 Queue looping ${player.isLoopQueue() ? 'enabled' : 'disabled'}.`);
}
```

#### `toggleLoopTrack(): void`
Toggles single-track looping on or off.

**Example**:
```typescript
if (command === 'looptrack') {
  player.toggleLoopTrack();
  message.channel.send(`🔂 Track looping ${player.isLoopTrack() ? 'enabled' : 'disabled'}.`);
}
```

#### `startRadio(urls: string[]): Promise<void>`
Starts radio mode by shuffling a list of URLs and playing them continuously.

**Example**:
```typescript
if (command === 'radio') {
  const urls = args; // Array of URLs
  if (!urls.length) {
    message.channel.send('Please provide at least one URL.');
    return;
  }
  await player.startRadio(urls);
  // The Start event will handle the response
}
player.on(MusicPlayerEvent.Start, ({ metadata }) => {
  message.channel.send(`📻 Radio mode started: ${metadata.title || metadata.url}`);
});
```

#### `stop(noLeave?: boolean): void`
Stops playback, clears the queue and history, and optionally disconnects from the voice channel.

**Example**:
```typescript
if (command === 'stop') {
  player.stop(true); // Stay in voice channel
  message.channel.send('⏹️ Playback stopped.');
}
player.on(MusicPlayerEvent.Stop, () => {
  message.channel.send('⏹️ Playback stopped.');
});
```

#### `disconnect(): void`
Disconnects the bot from the voice channel and clears all resources.

**Example**:
```typescript
if (command === 'disconnect') {
  player.disconnect();
  message.channel.send('🔌 Disconnected from voice channel.');
}
player.on(MusicPlayerEvent.Disconnect, () => {
  message.channel.send('🔌 Disconnected from voice channel.');
});
```

#### `getQueue(): TrackMetadata[]`
Returns a copy of the current queue as an array of `TrackMetadata`.

**Example**:
```typescript
if (command === 'queue') {
  const queue = player.getQueue();
  if (!queue.length) {
    message.channel.send('📃 Queue is empty.');
    return;
  }
  const queueList = queue.map((track, index) => `${index + 1}. ${track.title || track.url}`).join('\n');
  message.channel.send(`📃 Queue:\n${queueList}`);
}
```

#### `getVolume(): number`
Returns the current volume as a percentage (0–200%).

**Example**:
```typescript
if (command === 'volume') {
  const currentVolume = player.getVolume();
  message.channel.send(`🔊 Current volume: ${currentVolume}%`);
}
```

#### `isPlaying(): boolean`
Checks if a track is currently playing.

**Example**:
```typescript
if (command === 'status') {
  const status = player.isPlaying() ? 'playing' : 'not playing';
  message.channel.send(`🎵 Player is ${status}.`);
}
```

#### `isPaused(): boolean`
Checks if the player is currently paused.

**Example**:
```typescript
if (command === 'status') {
  const paused = player.isPaused() ? 'paused' : 'not paused';
  message.channel.send(`⏯️ Playback is ${paused}.`);
}
```

#### `isShuffiled(): boolean`
Checks if the queue is shuffled.

**Example**:
```typescript
if (command === 'status') {
  const shuffled = player.isShuffiled() ? 'shuffled' : 'not shuffled';
  message.channel.send(`🔀 Queue is ${shuffled}.`);
}
```

#### `searchLyrics(title: string, artist?: string): Promise<string | null>`
Fetches song lyrics from Google based on the provided title and optional artist.

**Example**:
```typescript
if (command === 'lyrics') {
  const title = args.join(' ');
  if (!title) {
    message.channel.send('Please provide a song title.');
    return;
  }
  const lyrics = await player.searchLyrics(title);
  message.channel.send(lyrics ? `🎵 Lyrics:\n${lyrics}` : '❌ No lyrics found.');
}
```

## Support and Contributions
- **Repository**: [https://github.com/Persian-Caesar/discord-player](https://github.com/Persian-Caesar/discord-player)
- **Issues**: [https://github.com/Persian-Caesar/discord-player/issues](https://github.com/Persian-Caesar/discord-player/issues)
- **Community**: Join the [Persian Caesar Discord](https://dsc.gg/persian-caesar) for support.
- **Contributions**: Pull requests are welcome! Please follow the contribution guidelines in the repository.

## License
This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file or the repository for details.

---

⌨️ Built with ❤️ by **[Sobhan-SRZA](https://github.com/Sobhan-SRZA)** for **[Persian Caesar](https://github.com/Persian-Caesar)**. Star the repo if you find it useful!

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