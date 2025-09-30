# @persian-caesar/discord-player

A lightweight, type-safe music player for Discord bots, built with TypeScript and integrated with `discord.js`. This package provides a robust `MusicPlayer` class for streaming audio from platforms like YouTube, SoundCloud, Spotify, and Deezer, with optional Lavalink support via Erela.js for enhanced performance and playlist handling. Without Lavalink, it falls back to direct streaming using libraries like `play-dl`, `soundcloud-downloader`, and `yt-dlp-exec`.

## Table of Contents
- [@persian-caesar/discord-player](#persian-caesardiscord-player)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Features](#features)
  - [Installation](#installation)
  - [Dependencies](#dependencies)
  - [Usage Examples](#usage-examples)
    - [TypeScript Example with Lavalink](#typescript-example-with-lavalink)
    - [TypeScript Example without Lavalink](#typescript-example-without-lavalink)
    - [JavaScript Example](#javascript-example)
  - [API Reference](#api-reference)
    - [MusicPlayer Class](#musicplayer-class)
    - [MusicPlayerEvent Enum](#musicplayerevent-enum)
    - [Method Usage and Examples](#method-usage-and-examples)
      - [`search(query: string, platform?: SearchPlatform): Promise<TrackMetadata[]>`](#searchquery-string-platform-searchplatform-promisetrackmetadata)
      - [`play(input: string | TrackMetadata | TrackMetadata[], radio?: boolean): Promise<void>`](#playinput-string--trackmetadata--trackmetadata-radio-boolean-promisevoid)
      - [`pause(): void`](#pause-void)
      - [`resume(): void`](#resume-void)
      - [`setVolume(percent: number): number`](#setvolumepercent-number-number)
      - [`skip(): void`](#skip-void)
      - [`previous(): Promise<void>`](#previous-promisevoid)
      - [`shuffle(): void`](#shuffle-void)
      - [`undoShuffle(): void`](#undoshuffle-void)
      - [`toggleLoopQueue(): boolean`](#toggleloopqueue-boolean)
      - [`toggleLoopTrack(): boolean`](#togglelooptrack-boolean)
      - [`startRadio(urls: string[]): Promise<void>`](#startradiourls-string-promisevoid)
      - [`stop(noLeave?: boolean): void`](#stopnoleave-boolean-void)
      - [`disconnect(): void`](#disconnect-void)
      - [`join(): VoiceConnection`](#join-voiceconnection)
      - [`getQueue(): TrackMetadata[]`](#getqueue-trackmetadata)
      - [`getVolume(): number`](#getvolume-number)
      - [`isPlaying(): boolean`](#isplaying-boolean)
      - [`isPaused(): boolean`](#ispaused-boolean)
      - [`isShuffiled(): boolean`](#isshuffiled-boolean)
      - [`isConnected(guildId?: string): boolean`](#isconnectedguildid-string-boolean)
      - [`searchLyrics(title: string, artist?: string): Promise<string | null>`](#searchlyricstitle-string-artist-string-promisestring--null)
  - [Support and Contributions](#support-and-contributions)
  - [License](#license)
  - [Contact](#contact)

## Introduction
`@persian-caesar/discord-player` is designed to simplify audio playback in Discord bots. It leverages the `@discordjs/voice` library for voice channel interactions and supports streaming from multiple platforms. Lavalink integration (via Erela.js) is optional for better scalability, playlist support, and performance. Without Lavalink, the player uses direct streaming for flexibility in smaller setups. The package is fully typed, making it ideal for TypeScript projects, and includes JSDoc annotations for JavaScript users. The `MusicPlayer` class handles all aspects of music playback, including multi-platform search, queue management, history tracking, and event-driven notifications.

Developed by [Sobhan-SRZA](https://github.com/Sobhan-SRZA) for [Persian Caesar](https://github.com/Persian-Caesar), this package is licensed under MIT and actively maintained.

## Features
- **Optional Lavalink Support**: Use Erela.js for advanced features like playlist loading and better audio handling, or fallback to direct streaming without it.
- **Multi-Platform Search and Streaming**: Supports YouTube, SoundCloud, Spotify, and Deezer. Search prioritizes platforms in order (configurable), returns a list of results.
- **Direct Stream Handling**: Streams non-platform URLs (e.g., radio stations) directly without searching.
- **Playlist Support**: When using Lavalink, automatically loads and enqueues tracks from playlists.
- **Queue Management**: Add tracks (single or multiple), shuffle, or revert to the original order.
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

| Package                 | Version | Purpose                                                                   |
| ----------------------- | ------- | ------------------------------------------------------------------------- |
| `@discordjs/voice`      | ^0.18.0 | Handles voice channel connections and audio playback in Discord.          |
| `@discordjs/opus`       | ^0.10.0 | Provides Opus audio encoding/decoding for high-quality audio streaming.   |
| `erela.js`              | ^2.4.0  | Optional: Access to Lavalink for enhanced audio and playlist support.     |
| `play-dl`               | ^1.9.7  | Streams audio from Spotify, YouTube, and Deezer with search capabilities (fallback mode). |
| `soundcloud-downloader` | ^1.0.0  | Downloads and streams audio from SoundCloud URLs (fallback mode).         |
| `yt-dlp-exec`           | ^3.0.0  | Executes yt-dlp for YouTube streaming in fallback mode.                   |
| `html-to-text`          | ^9.0.5  | Converts HTML (from Google lyrics searches) to plain text.                |
| `libsodium-wrappers`    | ^0.7.15 | Required for secure audio encryption in `@discordjs/voice`.               |
| `ffmpeg-static`         | (peer)  | Provides FFmpeg for audio processing and stream conversion.               |

**Why these dependencies?**
- `@discordjs/voice` and `@discordjs/opus` are core to Discord voice functionality, enabling the bot to join channels and stream audio.
- `erela.js` enables optional Lavalink integration for better scalability.
- `play-dl`, `soundcloud-downloader`, and `yt-dlp-exec` provide fallback streaming without Lavalink.
- `html-to-text` is used for scraping and cleaning lyrics from Google search results.
- `libsodium-wrappers` and `ffmpeg-static` are required for secure and efficient audio processing.

## Usage Examples
Below are examples demonstrating how to integrate `@persian-caesar/discord-player` with `discord.js` in both TypeScript and JavaScript. These examples assume you have a Discord bot set up with `discord.js`.

### TypeScript Example with Lavalink
This example uses Lavalink for playlist support and better performance.

```typescript
import { Client, GatewayIntentBits, TextChannel, VoiceChannel } from 'discord.js';
import { MusicPlayer, MusicPlayerEvent } from '@persian-caesar/discord-player';
import { Manager } from 'erela.js';

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Erela.js Manager for Lavalink
const manager = new Manager({
  nodes: [
    {
      host: "lava-all.ajieblogs.eu.org",
      port: 443,
      password: "https://dsc.gg/ajidevserver",
      secure: true,
    },
  ],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

// Bot configuration
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // Replace with your bot token

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
  manager.init(client.user!.id);
});

client.ws.on('VOICE_SERVER_UPDATE', (data) => manager.updateVoiceState(data));
client.ws.on('VOICE_STATE_UPDATE', (data) => manager.updateVoiceState(data));

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  const voiceChannel = message.member.voice.channel as VoiceChannel;
  const player = new MusicPlayer(voiceChannel, message.channel as TextChannel, 100, manager, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 minutes
  });

  // Event listeners for music player
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ Added to queue: ${metadata?.title || metadata?.url || 'playlist'} (${queue.length} in queue)`);
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
    // Search and play the first result
    const results = await player.search(query);
    if (results.length > 0) {
      await player.play(results[0]);
    } else {
      message.channel.send('No results found.');
    }
  } else if (command === 'search') {
    const query = args.join(' ');
    const results = await player.search(query);
    const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url}`).join('\n');
    message.channel.send(resultList || 'No results.');
  } // Add other commands as needed
});

client.login(TOKEN);
```

### TypeScript Example without Lavalink
This example uses fallback streaming without Lavalink.

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
  const player = new MusicPlayer(voiceChannel, message.channel as TextChannel, 100, undefined, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 minutes
    youtubeCookie: 'YOUR_YOUTUBE_COOKIE', // Optional for age-restricted content
  });

  // Event listeners for music player
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ Added to queue: ${metadata?.title || metadata?.url} (${queue.length} in queue)`);
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
    // Search and play the first result
    const results = await player.search(query);
    if (results.length > 0) {
      await player.play(results[0]);
    } else {
      message.channel.send('No results found.');
    }
  } else if (command === 'search') {
    const query = args.join(' ');
    const results = await player.search(query, 'spotify'); // Optional platform
    const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url}`).join('\n');
    message.channel.send(resultList || 'No results.');
  } // Add other commands as needed
});

client.login(TOKEN);
```

### JavaScript Example
This example uses plain JavaScript with optional Lavalink.

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { MusicPlayer, MusicPlayerEvent } = require('@persian-caesar/discord-player');
const { Manager } = require('erela.js');

// Optional Lavalink Manager
const manager = new Manager({
  nodes: [
    {
      host: "lava-all.ajieblogs.eu.org",
      port: 443,
      password: "https://dsc.gg/ajidevserver",
      secure: true,
    },
  ],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

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
  if (manager) manager.init(client.user.id); // If using Lavalink
});

if (manager) {
  client.ws.on('VOICE_SERVER_UPDATE', (data) => manager.updateVoiceState(data));
  client.ws.on('VOICE_STATE_UPDATE', (data) => manager.updateVoiceState(data));
}

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  /** @type {import('@persian-caesar/discord-player').VoiceChannel} */
  const voiceChannel = message.member.voice.channel;
  const player = new MusicPlayer(voiceChannel, message.channel, 100, manager, { // Pass manager if using Lavalink
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 minutes
  });

  // Event listeners for music player
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ Added to queue: ${metadata?.title || metadata?.url || 'playlist'} (${queue.length} in queue)`);
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
    // Search and play the first result
    const results = await player.search(query);
    if (results.length > 0) {
      await player.play(results[0]);
    } else {
      message.channel.send('No results found.');
    }
  } else if (command === 'search') {
    const query = args.join(' ');
    const results = await player.search(query);
    const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url}`).join('\n');
    message.channel.send(resultList || 'No results.');
  } // Add other commands as needed
});

client.login(TOKEN);
```

## API Reference

### MusicPlayer Class
**Constructor**:
```typescript
new MusicPlayer(
  channel: VoiceChannel,
  textChannel: TextChannel,
  initialVolume?: number, // Default: 100
  lavaLinkManager?: Manager, // Optional Erela.js Manager for Lavalink
  options?: MusicPlayerOptions // { autoLeaveOnEmptyQueue?: boolean, autoLeaveOnIdleMs?: number, youtubeCookie?: string }
)
```

**Methods**:
| Method                                         | Description                                                |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `search(query: string, platform?: SearchPlatform): Promise<TrackMetadata[]>` | Searches across platforms, returns list of results. |
| `play(input: string | TrackMetadata | TrackMetadata[], radio?: boolean): Promise<void>` | Plays input (string searches first result, metadata/array direct). Supports playlists with Lavalink. |
| `pause(): void`                                | Pauses the current track.                                  |
| `resume(): void`                               | Resumes playback.                                          |
| `setVolume(percent: number): number`           | Sets volume (0–200%), returns new volume.                  |
| `skip(): void`                                 | Skips to the next track in the queue.                      |
| `previous(): Promise<void>`                    | Plays the previous track from history.                     |
| `shuffle(): void`                              | Shuffles the queue, saving the original order.             |
| `undoShuffle(): void`                          | Restores the queue to its pre-shuffle order.               |
| `toggleLoopQueue(): boolean`                   | Toggles queue looping, returns new state.                  |
| `toggleLoopTrack(): boolean`                   | Toggles single-track looping, returns new state.           |
| `startRadio(urls: string[]): Promise<void>`    | Starts radio mode with shuffled URLs.                      |
| `stop(noLeave?: boolean): void`                | Stops playback, optionally disconnects.                    |
| `disconnect(): void`                           | Disconnects from the voice channel.                        |
| `join(): VoiceConnection`                      | Joins the voice channel without subscribing player.        |
| `getQueue(): TrackMetadata[]`                  | Returns a copy of the current queue.                       |
| `getVolume(): number`                          | Returns the current volume (0–200%).                       |
| `isPlaying(): boolean`                         | Checks if a track is playing.                              |
| `isPaused(): boolean`                          | Checks if playback is paused.                              |
| `isShuffiled(): boolean`                       | Checks if the queue is shuffled.                           |
| `isConnected(guildId?: string): boolean`       | Checks if connected to a voice channel.                    |
| `searchLyrics(title: string, artist?: string): Promise<string | null>` | Fetches song lyrics from Google.                           |

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
- `QueueAdd`: `{ metadata?: TrackMetadata, metadatas?: TrackMetadata[], queue: TrackMetadata[] }`
- `VolumeChange`: `{ volume: number }`
- `Skip`: `{ queue: TrackMetadata[], history: string[] }`
- `Previous`: `{ metadata: TrackMetadata, queue: TrackMetadata[], history: string[] }`
- `Shuffle`: `{ queue: TrackMetadata[] }`
- `LoopQueue`: `{ enabled: boolean }`
- `LoopTrack`: `{ enabled: boolean }`
- `Finish`: `{ queue: TrackMetadata[], history: string[] }`
- `Error`: `Error`
- Others: No payload

See `types.ts` for full type definitions.

### Method Usage and Examples
This section provides detailed explanations and code snippets for each `MusicPlayer` method, demonstrating their usage within a Discord bot context using `discord.js`. The examples assume a `MusicPlayer` instance is created as shown in the [Usage Examples](#usage-examples) section.

#### `search(query: string, platform?: SearchPlatform): Promise<TrackMetadata[]>`
Searches for tracks across platforms. Returns a list of results. Platform order: With Lavalink - YouTube, Spotify, SoundCloud, Deezer; without - Spotify, SoundCloud, YouTube, Deezer. Direct non-platform URLs return a single direct stream metadata.

**Example**:
```typescript
if (command === 'search') {
  const query = args.join(' ');
  const results = await player.search(query, 'youtube'); // Optional platform
  if (results.length === 0) {
    message.channel.send('No results found.');
    return;
  }
  const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url} (${r.source})`).join('\n');
  message.channel.send(`Results:\n${resultList}`);
}
```

#### `play(input: string | TrackMetadata | TrackMetadata[], radio?: boolean): Promise<void>`
Plays input. If string, searches and plays first result. If TrackMetadata or array, plays directly. Supports playlists with Lavalink.

**Example**:
```typescript
if (command === 'play') {
  const query = args.join(' ');
  if (!query) {
    message.channel.send('Please provide a URL or search query.');
    return;
  }
  // Option 1: Play string (searches automatically)
  await player.play(query);

  // Option 2: Search first, then play specific result
  const results = await player.search(query);
  if (results.length > 0) {
    await player.play(results[0]); // Play first
    // or player.play(results); // Play all as playlist (with Lavalink)
  } else {
    message.channel.send('No results found.');
  }
}
player.on(MusicPlayerEvent.Start, ({ metadata }) => {
  message.channel.send(`▶️ Now playing: ${metadata.title || metadata.url}`);
});
player.on(MusicPlayerEvent.QueueAdd, ({ metadata, metadatas, queue }) => {
  const added = metadatas ? metadatas.length + ' tracks' : metadata?.title || metadata?.url;
  message.channel.send(`➕ Added: ${added} (${queue.length} in queue)`);
});
```

#### `pause(): void`
Pauses the current track.

**Example**:
```typescript
if (command === 'pause') {
  player.pause();
  message.channel.send('⏸️ Playback paused.');
}
```

#### `resume(): void`
Resumes playback.

**Example**:
```typescript
if (command === 'resume') {
  player.resume();
  message.channel.send('▶️ Playback resumed.');
}
```

#### `setVolume(percent: number): number`
Sets volume (0–200%), returns new volume.

**Example**:
```typescript
if (command === 'volume') {
  const volume = parseInt(args[0]);
  if (isNaN(volume)) {
    message.channel.send('Please provide a valid volume (0–200).');
    return;
  }
  const newVolume = player.setVolume(volume);
  message.channel.send(`🔊 Volume set to ${newVolume}%`);
}
player.on(MusicPlayerEvent.VolumeChange, ({ volume }) => {
  message.channel.send(`🔊 Volume changed to ${volume}%`);
});
```

#### `skip(): void`
Skips to the next track.

**Example**:
```typescript
if (command === 'skip') {
  player.skip();
  message.channel.send('⏭️ Skipped to next track.');
}
player.on(MusicPlayerEvent.Skip, ({ queue }) => {
  message.channel.send(`⏭️ Skipped. ${queue.length} tracks remaining.`);
});
```

#### `previous(): Promise<void>`
Plays the previous track.

**Example**:
```typescript
if (command === 'previous') {
  await player.previous();
}
player.on(MusicPlayerEvent.Previous, ({ metadata }) => {
  message.channel.send(`⏮️ Playing previous: ${metadata.title || metadata.url}`);
});
```

#### `shuffle(): void`
Shuffles the queue.

**Example**:
```typescript
if (command === 'shuffle') {
  player.shuffle();
  message.channel.send('🔀 Queue shuffled.');
}
player.on(MusicPlayerEvent.Shuffle, ({ queue }) => {
  message.channel.send(`🔀 Shuffled. ${queue.length} tracks in new order.`);
});
```

#### `undoShuffle(): void`
Restores pre-shuffle order.

**Example**:
```typescript
if (command === 'unshuffle') {
  player.undoShuffle();
  message.channel.send('🔄 Queue restored.');
}
```

#### `toggleLoopQueue(): boolean`
Toggles queue loop, returns state.

**Example**:
```typescript
if (command === 'loopqueue') {
  const enabled = player.toggleLoopQueue();
  message.channel.send(`🔁 Queue loop ${enabled ? 'enabled' : 'disabled'}.`);
}
player.on(MusicPlayerEvent.LoopQueue, ({ enabled }) => {
  message.channel.send(`🔁 Queue loop ${enabled ? 'enabled' : 'disabled'}.`);
});
```

#### `toggleLoopTrack(): boolean`
Toggles track loop, returns state.

**Example**:
```typescript
if (command === 'looptrack') {
  const enabled = player.toggleLoopTrack();
  message.channel.send(`🔂 Track loop ${enabled ? 'enabled' : 'disabled'}.`);
}
player.on(MusicPlayerEvent.LoopTrack, ({ enabled }) => {
  message.channel.send(`🔂 Track loop ${enabled ? 'enabled' : 'disabled'}.`);
});
```

#### `startRadio(urls: string[]): Promise<void>`
Starts radio mode.

**Example**:
```typescript
if (command === 'radio') {
  const urls = args; // Array of URLs
  await player.startRadio(urls);
  message.channel.send('📻 Radio mode started.');
}
```

#### `stop(noLeave?: boolean): void`
Stops playback.

**Example**:
```typescript
if (command === 'stop') {
  player.stop(true); // Stay connected
  message.channel.send('⏹️ Stopped.');
}
player.on(MusicPlayerEvent.Stop, () => {
  message.channel.send('⏹️ Stopped.');
});
```

#### `disconnect(): void`
Disconnects from voice.

**Example**:
```typescript
if (command === 'leave') {
  player.disconnect();
  message.channel.send('🔌 Disconnected.');
}
player.on(MusicPlayerEvent.Disconnect, () => {
  message.channel.send('🔌 Disconnected.');
});
```

#### `join(): VoiceConnection`
Joins voice channel without player subscribe.

**Example**:
```typescript
if (command === 'join') {
  const connection = player.join();
  message.channel.send('🔗 Joined voice channel.');
}
```

#### `getQueue(): TrackMetadata[]`
Gets queue copy.

**Example**:
```typescript
if (command === 'queue') {
  const queue = player.getQueue();
  const list = queue.map((t, i) => `${i + 1}. ${t.title || t.url}`).join('\n');
  message.channel.send(`📃 Queue:\n${list || 'Empty'}`);
}
```

#### `getVolume(): number`
Gets volume.

**Example**:
```typescript
if (command === 'volume') {
  message.channel.send(`🔊 Volume: ${player.getVolume()}%`);
}
```

#### `isPlaying(): boolean`
Checks playing.

**Example**:
```typescript
if (command === 'status') {
  message.channel.send(`🎵 ${player.isPlaying() ? 'Playing' : 'Not playing'}.`);
}
```

#### `isPaused(): boolean`
Checks paused.

**Example**:
```typescript
if (command === 'status') {
  message.channel.send(`⏯️ ${player.isPaused() ? 'Paused' : 'Not paused'}.`);
}
```

#### `isShuffiled(): boolean`
Checks shuffled.

**Example**:
```typescript
if (command === 'status') {
  message.channel.send(`🔀 Queue is ${player.isShuffiled() ? 'shuffled' : 'not shuffled'}.`);
}
```

#### `isConnected(guildId?: string): boolean`
Checks connected.

**Example**:
```typescript
if (command === 'status') {
  message.channel.send(`🔗 ${player.isConnected() ? 'Connected' : 'Not connected'}.`);
}
```

#### `searchLyrics(title: string, artist?: string): Promise<string | null>`
Fetches lyrics.

**Example**:
```typescript
if (command === 'lyrics') {
  const title = args.join(' ');
  const lyrics = await player.searchLyrics(title, 'artist');
  message.channel.send(lyrics ? `🎵 Lyrics:\n${lyrics}` : 'No lyrics found.');
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