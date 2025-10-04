# @persian-caesar/discord-player

یک پخش‌کننده موسیقی سبک و ایمن برای بات‌های دیسکورد، ساخته‌شده با TypeScript و یکپارچه با `discord.js`. این بسته یک کلاس قدرتمند `MusicPlayer` برای پخش صوت از پلتفرم‌هایی مانند یوتیوب، ساندکلاد، اسپاتیفای و دیزر ارائه می‌دهد، با پشتیبانی اختیاری از Lavalink از طریق Erela.js برای عملکرد بهتر و مدیریت لیست پخش. بدون Lavalink، پخش مستقیم با استفاده از کتابخانه‌هایی مانند `play-dl`، `soundcloud-downloader` و `yt-dlp-exec` انجام می‌شود.

## فهرست مطالب
- [@persian-caesar/discord-player](#persian-caesardiscord-player)
  - [فهرست مطالب](#فهرست-مطالب)
  - [مقدمه](#مقدمه)
  - [ویژگی‌ها](#ویژگیها)
  - [نصب](#نصب)
  - [وابستگی‌ها](#وابستگیها)
  - [نمونه‌های استفاده](#نمونههای-استفاده)
    - [نمونه TypeScript با Lavalink](#نمونه-typescript-با-lavalink)
    - [نمونه TypeScript بدون Lavalink](#نمونه-typescript-بدون-lavalink)
    - [نمونه JavaScript](#نمونه-javascript)
  - [مرجع API](#مرجع-api)
    - [کلاس MusicPlayer](#کلاس-musicplayer)
    - [شمارش MusicPlayerEvent](#شمارش-musicplayerevent)
    - [استفاده و نمونه‌های متدها](#استفاده-و-نمونههای-متدها)
      - [`isPlaylist(url: string): Promise<boolean>`](#isplaylisturl-string-promiseboolean)
      - [`searchPlaylists(query: string, platform?: SearchPlatform, limit?: number): Promise<PlaylistMetadata[]>`](#searchplaylistsquery-string-platform-searchplatform-limit-number-promiseplaylistmetadata)
      - [`search(query: string, platform?: SearchPlatform, limit?: number): Promise<TrackMetadata[]>`](#searchquery-string-platform-searchplatform-limit-number-promisetrackmetadata)
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
  - [پشتیبانی و مشارکت](#پشتیبانی-و-مشارکت)
  - [مجوز](#مجوز)
  - [تماس](#تماس)

## مقدمه
`@persian-caesar/discord-player` برای ساده‌سازی پخش صوت در بات‌های دیسکورد طراحی شده است. این بسته از کتابخانه `@discordjs/voice` برای تعامل با کانال‌های صوتی استفاده می‌کند و از پخش از چندین پلتفرم پشتیبانی می‌کند. ادغام اختیاری با Lavalink (از طریق Erela.js) برای مقیاس‌پذیری بهتر، پشتیبانی از لیست پخش و عملکرد بهبودیافته ارائه می‌شود. بدون Lavalink، پخش‌کننده از پخش مستقیم برای انعطاف‌پذیری در تنظیمات کوچک‌تر استفاده می‌کند. این بسته کاملاً تایپ‌شده است و برای پروژه‌های TypeScript ایده‌آل است، همچنین شامل حاشیه‌نویسی‌های JSDoc برای کاربران JavaScript می‌باشد. کلاس `MusicPlayer` تمام جنبه‌های پخش موسیقی، از جمله جستجوی چندپلتفرمی، مدیریت صف، ردیابی تاریخچه و اعلان‌های مبتنی بر رویداد را مدیریت می‌کند.

این بسته توسط [Sobhan-SRZA](https://github.com/Sobhan-SRZA) برای [Persian Caesar](https://github.com/Persian-Caesar) توسعه یافته و تحت مجوز MIT منتشر شده و به‌صورت فعال نگهداری می‌شود.

## ویژگی‌ها
- **پشتیبانی اختیاری از Lavalink**: استفاده از Erela.js برای ویژگی‌های پیشرفته مانند بارگذاری لیست پخش و مدیریت بهتر صوت، یا بازگشت به پخش مستقیم بدون آن.
- **جستجو و پخش چندپلتفرمی**: پشتیبانی از یوتیوب، ساندکلاد، اسپاتیفای و دیزر. جستجو به ترتیب اولویت پلتفرم‌ها (قابل تنظیم) انجام شده و لیستی از نتایج را برمی‌گرداند.
- **مدیریت پخش مستقیم**: پخش مستقیم URLهای غیرپلتفرمی (مانند ایستگاه‌های رادیویی) بدون نیاز به جستجو.
- **پشتیبانی از لیست پخش**: تشخیص، جستجو و بارگذاری لیست‌های پخش از تمام پلتفرم‌های پشتیبانی‌شده، افزودن خودکار آهنگ‌ها به صف.
- **مدیریت صف**: افزودن آهنگ‌ها (تکی یا چندگانه)، به‌هم‌ریختن صف یا بازگشت به ترتیب اصلی.
- **گزینه‌های حلقه**: فعال/غیرفعال کردن حلقه برای یک آهنگ یا کل صف.
- **کنترل صدا**: تنظیم بلندی صدا (0–200٪).
- **دریافت متن آهنگ**: بازیابی متن آهنگ از نتایج جستجوی گوگل با استفاده از `html-to-text`.
- **حالت رادیو**: پخش لیست URLهای به‌هم‌ریخته در یک حلقه پیوسته.
- **سیستم رویدادها**: رویدادهای تایپ‌شده قوی برای وضعیت پخش، تغییرات صف، خطاها و غیره.
- **قطع خودکار**: گزینه‌های قابل تنظیم برای خروج از کانال‌های صوتی در صورت خالی بودن صف یا پس از زمان بی‌فعالی.
- **ایمنی تایپ**: پشتیبانی کامل از TypeScript با رابط‌ها و شمارش‌های تعریف‌شده در `types.ts`.
- **سبک‌وزن**: وابستگی‌های حداقلی بدون نیاز به چارچوب خارجی به جز `discord.js`.

## نصب
بسته را نصب کنید:

```bash
npm install @persian-caesar/discord-player
```

مطمئن شوید که از Node.js نسخه 16 یا بالاتر استفاده می‌کنید، همان‌طور که در `package.json` مشخص شده است.

## وابستگی‌ها
وابستگی‌های زیر برای عملکرد صحیح بسته مورد نیاز هستند:

| بسته                    | نسخه    | هدف                                                                  |
| ----------------------- | ------- | -------------------------------------------------------------------- |
| `@discordjs/voice`      | ^0.18.0 | مدیریت اتصال به کانال‌های صوتی و پخش صوت در دیسکورد.                  |
| `@discordjs/opus`       | ^0.10.0 | ارائه کدگذاری/رمزگشایی صوتی Opus برای پخش صوت با کیفیت بالا.         |
| `erela.js`              | ^2.4.0  | اختیاری: دسترسی به Lavalink برای پشتیبانی پیشرفته از صوت و لیست پخش. |
| `play-dl`               | ^1.9.7  | پخش صوت از اسپاتیفای، یوتیوب و دیزر با قابلیت جستجو (حالت بازگشتی).  |
| `soundcloud-downloader` | ^1.0.0  | دانلود و پخش صوت از URLهای ساندکلاد (حالت بازگشتی).                  |
| `html-to-text`          | ^9.0.5  | تبدیل HTML (از جستجوهای متن آهنگ گوگل) به متن ساده.                  |
| `libsodium-wrappers`    | ^0.7.15 | مورد نیاز برای رمزگذاری امن صوت در `@discordjs/voice`.               |
| `ffmpeg-static`         | (peer)  | ارائه FFmpeg برای پردازش صوت و تبدیل جریان.                          |

**چرا این وابستگی‌ها؟**
- `@discordjs/voice` و `@discordjs/opus` هسته اصلی عملکرد صوتی دیسکورد هستند و به بات امکان پیوستن به کانال‌ها و پخش صوت را می‌دهند.
- `erela.js` ادغام اختیاری با Lavalink را برای مقیاس‌پذیری بهتر فراهم می‌کند.
- `play-dl` و `soundcloud-downloader` پخش بازگشتی بدون Lavalink را ارائه می‌دهند.
- `html-to-text` برای استخراج و تمیز کردن متن آهنگ از نتایج جستجوی گوگل استفاده می‌شود.
- `libsodium-wrappers` و `ffmpeg-static` برای پردازش امن و کارآمد صوت مورد نیاز هستند.

## نمونه‌های استفاده
در زیر نمونه‌هایی برای نشان دادن نحوه ادغام `@persian-caesar/discord-player` با `discord.js` در TypeScript و JavaScript ارائه شده است. این نمونه‌ها فرض می‌کنند که شما یک بات دیسکورد با `discord.js` راه‌اندازی کرده‌اید.

### نمونه TypeScript با Lavalink
این نمونه از Lavalink برای پشتیبانی از لیست پخش و عملکرد بهتر استفاده می‌کند.

```typescript
import { Client, GatewayIntentBits, TextChannel, VoiceChannel } from 'discord.js';
import { MusicPlayer, MusicPlayerEvent, LavalinkManager } from '@persian-caesar/discord-player';

// راه‌اندازی کلاینت دیسکورد با intentهای مورد نیاز
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// راه‌اندازی مدیر Erela.js برای Lavalink
const manager = new LavalinkManager(client, {
  nodes: [
    {
      host: "lava-v4.ajieblogs.eu.org",
      port: 443,
      password: "https://dsc.gg/ajidevserver",
      secure: true
    }
  ]
});

// پیکربندی بات
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // توکن بات خود را جایگزین کنید

client.on('ready', () => {
  console.log(`وارد شده به عنوان ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  const voiceChannel = message.member.voice.channel as VoiceChannel;
  const player = new MusicPlayer(voiceChannel, message.channel as TextChannel, manager, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000 // 5 دقیقه
  });

  // شنونده‌های رویداد برای پخش‌کننده موسیقی
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, metadatas, queue }) => {
    const added = metadatas ? metadatas.length + ' آهنگ' : metadata?.title || metadata?.url;
    message.channel.send(`➕ اضافه شد: ${added} (${queue.length} در صف)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ خطا: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ پخش پایان یافت.');
  });

  // مدیریت دستورات
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('لطفاً یک URL یا پرس‌وجو ارائه دهید.');
      return;
    }
    await player.play(query);
  } 
  
  else if (command === 'search') {
    const query = args.join(' ');
    const results = await player.search(query, 'youtube');
    const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url}`).join('\n');
    message.channel.send(resultList || 'نتیجه‌ای یافت نشد.');
  } 
  
  else if (command === 'playlists') {
    const query = args.join(' ');
    const playlists = await player.searchPlaylists(query, 'spotify');
    const list = playlists.map((p, i) => `${i + 1}. ${p.title} (${p.trackCount} آهنگ): ${p.url}`).join('\n');
    message.channel.send(list || 'لیست پخشی یافت نشد.');
  } 
  
  else if (command === 'isplaylist') {
    const url = args[0];
    const isPlaylist = await player.isPlaylist(url);
    message.channel.send(isPlaylist ? 'بله، این یک لیست پخش است.' : 'خیر، این یک لیست پخش نیست.');
  } // دستورات دیگر را به نیاز اضافه کنید
});

client.login(TOKEN);
```

### نمونه TypeScript بدون Lavalink
این نمونه از پخش مستقیم بدون Lavalink استفاده می‌کند.

```typescript
import { Client, GatewayIntentBits, TextChannel, VoiceChannel } from 'discord.js';
import { MusicPlayer, MusicPlayerEvent } from '@persian-caesar/discord-player';

// راه‌اندازی کلاینت دیسکورد با intentهای مورد نیاز
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// پیکربندی بات
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // توکن بات خود را جایگزین کنید

client.on('ready', () => {
  console.log(`وارد شده به عنوان ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  const voiceChannel = message.member.voice.channel as VoiceChannel;
  const player = new MusicPlayer(voiceChannel, message.channel as TextChannel, undefined, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 دقیقه
    youtubeCookie: 'YOUR_YOUTUBE_COOKIE', // اختیاری برای محتوای محدود شده با سن
  });

  // شنونده‌های رویداد برای پخش‌کننده موسیقی
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, metadatas, queue }) => {
    const added = metadatas ? metadatas.length + ' آهنگ' : metadata?.title || metadata?.url;
    message.channel.send(`➕ اضافه شد: ${added} (${queue.length} در صف)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ خطا: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ پخش پایان یافت.');
  });

  // مدیریت دستورات
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('لطفاً یک URL یا پرس‌وجو ارائه دهید.');
      return;
    }
    await player.play(query);
  } 
  
  else if (command === 'search') {
    const query = args.join(' ');
    const results = await player.search(query, 'spotify'); // پلتفرم اختیاری
    const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url}`).join('\n');
    message.channel.send(resultList || 'نتیجه‌ای یافت نشد.');
  } 
  
  else if (command === 'playlists') {
    const query = args.join(' ');
    const playlists = await player.searchPlaylists(query, 'deezer');
    const list = playlists.map((p, i) => `${i + 1}. ${p.title} (${p.trackCount} آهنگ): ${p.url}`).join('\n');
    message.channel.send(list || 'لیست پخشی یافت نشد.');
  } 
  
  else if (command === 'isplaylist') {
    const url = args[0];
    const isPlaylist = await player.isPlaylist(url);
    message.channel.send(isPlaylist ? 'بله، این یک لیست پخش است.' : 'خیر، این یک لیست پخش نیست.');
  } // دستورات دیگر را به نیاز اضافه کنید
});

client.login(TOKEN);
```

### نمونه JavaScript
این نمونه از JavaScript خالص با Lavalink اختیاری استفاده می‌کند.

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { MusicPlayer, MusicPlayerEvent, LavalinkManager } = require('@persian-caesar/discord-player');

// راه‌اندازی کلاینت دیسکورد با intentهای مورد نیاز
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// مدیر Lavalink اختیاری
const manager = new LavalinkManager(client, {
  nodes: [
    {
      host: "lava-v4.ajieblogs.eu.org",
      port: 443,
      password: "https://dsc.gg/ajidevserver",
      secure: true
    }
  ]
});

// پیکربندی بات
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // توکن بات خود را جایگزین کنید

client.on('ready', () => {
  console.log(`وارد شده به عنوان ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  /** @type {import('@persian-caesar/discord-player').VoiceChannel} */
  const voiceChannel = message.member.voice.channel;
  const player = new MusicPlayer(voiceChannel, message.channel, manager, { // اگر از Lavalink استفاده می‌کنید، manager را ارسال کنید
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000 // 5 دقیقه
  });

  // شنونده‌های رویداد برای پخش‌کننده موسیقی
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, metadatas, queue }) => {
    const added = metadatas ? metadatas.length + ' آهنگ' : metadata?.title || metadata?.url;
    message.channel.send(`➕ اضافه شد: ${added} (${queue.length} در صف)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ خطا: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ پخش پایان یافت.');
  });

  // مدیریت دستورات
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('لطفاً یک URL یا پرس‌وجو ارائه دهید.');
      return;
    }
    await player.play(query);
  } 
  
  else if (command === 'search') {
    const query = args.join(' ');
    const results = await player.search(query);
    const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url}`).join('\n');
    message.channel.send(resultList || 'نتیجه‌ای یافت نشد.');
  } 
  
  else if (command === 'playlists') {
    const query = args.join(' ');
    const playlists = await player.searchPlaylists(query);
    const list = playlists.map((p, i) => `${i + 1}. ${p.title} (${p.trackCount} آهنگ): ${p.url}`).join('\n');
    message.channel.send(list || 'لیست پخشی یافت نشد.');
  } 
  
  else if (command === 'isplaylist') {
    const url = args[0];
    const isPlaylist = await player.isPlaylist(url);
    message.channel.send(isPlaylist ? 'بله، این یک لیست پخش است.' : 'خیر، این یک لیست پخش نیست.');
  } // دستورات دیگر را به نیاز اضافه کنید
});

client.login(TOKEN);
```

## مرجع API

### کلاس MusicPlayer
**سازنده**:
```typescript
new MusicPlayer(
  channel: VoiceChannel,
  textChannel: TextChannel,
  lavaLinkManager?: Manager, // مدیر Erela.js اختیاری برای Lavalink
  options?: MusicPlayerOptions // { initialVolume?: number, autoLeaveOnEmptyQueue?: boolean, autoLeaveOnIdleMs?: number, youtubeCookie?: string, logError?: boolean }
)
```

**متدها**:
| متد                                                                                                      | توضیحات                                                |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `isPlaylist(url: string): Promise<boolean>`                                                              | بررسی می‌کند که آیا URL داده‌شده یک لیست پخش است.        |
| `searchPlaylists(query: string, platform?: SearchPlatform, limit?: number): Promise<PlaylistMetadata[]>` | جستجوی لیست‌های پخش در پلتفرم‌ها.                        |
| `search(query: string, platform?: SearchPlatform, limit?: number): Promise<TrackMetadata[]>`             | جستجوی آهنگ‌ها در پلتفرم‌ها.                             |
| `play(input: string                                                                                      | TrackMetadata                                          | TrackMetadata[], radio?: boolean): Promise<void>` | پخش ورودی (رشته جستجو می‌کند و اولین نتیجه یا لیست پخش را بارگذاری می‌کند، متادیتا/آرایه مستقیم پخش می‌شود). پشتیبانی از لیست پخش. |
| `pause(): void`                                                                                          | مکث آهنگ فعلی.                                         |
| `resume(): void`                                                                                         | ادامه پخش.                                             |
| `setVolume(percent: number): number`                                                                     | تنظیم صدا (0–200٪)، مقدار جدید را برمی‌گرداند.          |
| `skip(): void`                                                                                           | پرش به آهنگ بعدی در صف.                                |
| `previous(): Promise<void>`                                                                              | پخش آهنگ قبلی از تاریخچه.                              |
| `shuffle(): void`                                                                                        | به‌هم‌ریختن صف، ذخیره ترتیب اصلی.                        |
| `undoShuffle(): void`                                                                                    | بازگرداندن صف به ترتیب پیش از به‌هم‌ریختن.               |
| `toggleLoopQueue(): boolean`                                                                             | فعال/غیرفعال کردن حلقه صف، وضعیت جدید را برمی‌گرداند.   |
| `toggleLoopTrack(): boolean`                                                                             | فعال/غیرفعال کردن حلقه آهنگ، وضعیت جدید را برمی‌گرداند. |
| `startRadio(urls: string[]): Promise<void>`                                                              | شروع حالت رادیو با URLهای به‌هم‌ریخته.                   |
| `stop(noLeave?: boolean): void`                                                                          | توقف پخش، به‌صورت اختیاری قطع اتصال می‌کند.              |
| `disconnect(): void`                                                                                     | قطع اتصال از کانال صوتی.                               |
| `join(): VoiceConnection`                                                                                | پیوستن به کانال صوتی بدون اشتراک پخش‌کننده.             |
| `getQueue(): TrackMetadata[]`                                                                            | کپی صف فعلی را برمی‌گرداند.                             |
| `getVolume(): number`                                                                                    | بلندی صدای فعلی (0–200٪) را برمی‌گرداند.                |
| `isPlaying(): boolean`                                                                                   | بررسی می‌کند که آیا آهنگی در حال پخش است.               |
| `isPaused(): boolean`                                                                                    | بررسی می‌کند که آیا پخش مکث شده است.                    |
| `isShuffiled(): boolean`                                                                                 | بررسی می‌کند که آیا صف به‌هم‌ریخته است.                   |
| `isConnected(guildId?: string): boolean`                                                                 | بررسی می‌کند که آیا به کانال صوتی متصل است.             |
| `searchLyrics(title: string, artist?: string): Promise<string                                            | null>`                                                 | بازیابی متن آهنگ از گوگل.                         |

### شمارش MusicPlayerEvent
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

**محتوای رویدادها**:
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
- سایرین: بدون محتوا

برای تعاریف کامل تایپ، به `types.ts` مراجعه کنید.

### استفاده و نمونه‌های متدها
این بخش توضیحات مفصل و نمونه‌های کد برای هر متد `MusicPlayer` ارائه می‌دهد و استفاده از آن‌ها را در زمینه بات دیسکورد با استفاده از `discord.js` نشان می‌دهد. نمونه‌ها فرض می‌کنند که یک نمونه `MusicPlayer` همان‌طور که در بخش [نمونه‌های استفاده](#نمونه‌های-استفاده) نشان داده شده، ایجاد شده است.

#### `isPlaylist(url: string): Promise<boolean>`
بررسی می‌کند که آیا URL داده‌شده یک لیست پخش است.

**نمونه**:
```typescript
if (command === 'isplaylist') {
  const url = args[0];
  const isPlaylist = await player.isPlaylist(url);
  message.channel.send(isPlaylist ? 'بله، این یک لیست پخش است.' : 'خیر، این یک لیست پخش نیست.');
}
```

#### `searchPlaylists(query: string, platform?: SearchPlatform, limit?: number): Promise<PlaylistMetadata[]>`
جستجوی لیست‌های پخش در پلتفرم‌ها.

**نمونه**:
```typescript
if (command === 'playlists') {
  const query = args.join(' ');
  const playlists = await player.searchPlaylists(query, 'spotify', 5);
  if (playlists.length === 0) {
    message.channel.send('لیست پخشی یافت نشد.');
    return;
  }
  const list = playlists.map((p, i) => `${i + 1}. ${p.title} (${p.trackCount} آهنگ): ${p.url}`).join('\n');
  message.channel.send(`لیست‌های پخش:\n${list}`);
}
```

#### `search(query: string, platform?: SearchPlatform, limit?: number): Promise<TrackMetadata[]>`
جستجوی آهنگ‌ها در پلتفرم‌ها.

**نمونه**:
```typescript
if (command === 'search') {
  const query = args.join(' ');
  const results = await player.search(query, 'youtube', 5);
  if (results.length === 0) {
    message.channel.send('نتیجه‌ای یافت نشد.');
    return;
  }
  const resultList = results.map((r, i) => `${i + 1}. ${r.title || r.url} (${r.source})`).join('\n');
  message.channel.send(`نتایج:\n${resultList}`);
}
```

#### `play(input: string | TrackMetadata | TrackMetadata[], radio?: boolean): Promise<void>`
پخش ورودی. اگر رشته باشد، اولین نتیجه را جستجو و پخش می‌کند یا لیست پخش را بارگذاری می‌کند. اگر متادیتا یا آرایه باشد، مستقیم پخش می‌شود.

**نمونه**:
```typescript
if (command === 'play') {
  const query = args.join(' ');
  if (!query) {
    message.channel.send('لطفاً یک URL یا پرس‌وجو ارائه دهید.');
    return;
  }
  await player.play(query);
}
player.on(MusicPlayerEvent.Start, ({ metadata }) => {
  message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
});
player.on(MusicPlayerEvent.QueueAdd, ({ metadata, metadatas, queue }) => {
  const added = metadatas ? metadatas.length + ' آهنگ' : metadata?.title || metadata?.url;
  message.channel.send(`➕ اضافه شد: ${added} (${queue.length} در صف)`);
});
```

#### `pause(): void`
مکث آهنگ فعلی.

**نمونه**:
```typescript
if (command === 'pause') {
  player.pause();
  message.channel.send('⏸️ پخش مکث شد.');
}
```

#### `resume(): void`
ادامه پخش.

**نمونه**:
```typescript
if (command === 'resume') {
  player.resume();
  message.channel.send('▶️ پخش ادامه یافت.');
}
```

#### `setVolume(percent: number): number`
تنظیم صدا (0–200٪)، مقدار جدید را برمی‌گرداند.

**نمونه**:
```typescript
if (command === 'volume') {
  const volume = parseInt(args[0]);
  if (isNaN(volume)) {
    message.channel.send('لطفاً یک مقدار صدای معتبر (0–200) ارائه دهید.');
    return;
  }
  const newVolume = player.setVolume(volume);
  message.channel.send(`🔊 صدا تنظیم شد به ${newVolume}%`);
}
player.on(MusicPlayerEvent.VolumeChange, ({ volume }) => {
  message.channel.send(`🔊 صدا تغییر کرد به ${volume}%`);
});
```

#### `skip(): void`
پرش به آهنگ بعدی در صف.

**نمونه**:
```typescript
if (command === 'skip') {
  player.skip();
  message.channel.send('⏭️ به آهنگ بعدی پرش شد.');
}
player.on(MusicPlayerEvent.Skip, ({ queue }) => {
  message.channel.send(`⏭️ پرش شد. ${queue.length} آهنگ باقی مانده.`);
});
```

#### `previous(): Promise<void>`
پخش آهنگ قبلی از تاریخچه.

**نمونه**:
```typescript
if (command === 'previous') {
  await player.previous();
}
player.on(MusicPlayerEvent.Previous, ({ metadata }) => {
  message.channel.send(`⏮️ پخش قبلی: ${metadata.title || metadata.url}`);
});
```

#### `shuffle(): void`
به‌هم‌ریختن صف.

**نمونه**:
```typescript
if (command === 'shuffle') {
  player.shuffle();
  message.channel.send('🔀 صف به‌هم‌ریخته شد.');
}
player.on(MusicPlayerEvent.Shuffle, ({ queue }) => {
  message.channel.send(`🔀 به‌هم‌ریخته شد. ${queue.length} آهنگ در ترتیب جدید.`);
});
```

#### `undoShuffle(): void`
بازگرداندن صف به ترتیب پیش از به‌هم‌ریختن.

**نمونه**:
```typescript
if (command === 'unshuffle') {
  player.undoShuffle();
  message.channel.send('🔄 صف بازگردانی شد.');
}
```

#### `toggleLoopQueue(): boolean`
فعال/غیرفعال کردن حلقه صف، وضعیت جدید را برمی‌گرداند.

**نمونه**:
```typescript
if (command === 'loopqueue') {
  const enabled = player.toggleLoopQueue();
  message.channel.send(`🔁 حلقه صف ${enabled ? 'فعال' : 'غیرفعال'} شد.`);
}
player.on(MusicPlayerEvent.LoopQueue, ({ enabled }) => {
  message.channel.send(`🔁 حلقه صف ${enabled ? 'فعال' : 'غیرفعال'} شد.`);
});
```

#### `toggleLoopTrack(): boolean`
فعال/غیرفعال کردن حلقه آهنگ، وضعیت جدید را برمی‌گرداند.

**نمونه**:
```typescript
if (command === 'looptrack') {
  const enabled = player.toggleLoopTrack();
  message.channel.send(`🔂 حلقه آهنگ ${enabled ? 'فعال' : 'غیرفعال'} شد.`);
}
player.on(MusicPlayerEvent.LoopTrack, ({ enabled }) => {
  message.channel.send(`🔂 حلقه آهنگ ${enabled ? 'فعال' : 'غیرفعال'} شد.`);
});
```

#### `startRadio(urls: string[]): Promise<void>`
شروع حالت رادیو.

**نمونه**:
```typescript
if (command === 'radio') {
  const urls = args; // آرایه URLها
  await player.startRadio(urls);
  message.channel.send('📻 حالت رادیو شروع شد.');
}
```

#### `stop(noLeave?: boolean): void`
توقف پخش.

**نمونه**:
```typescript
if (command === 'stop') {
  player.stop(true); // متصل باقی بماند
  message.channel.send('⏹️ متوقف شد.');
}
player.on(MusicPlayerEvent.Stop, () => {
  message.channel.send('⏹️ متوقف شد.');
});
```

#### `disconnect(): void`
قطع اتصال از کانال صوتی.

**نمونه**:
```typescript
if (command === 'leave') {
  player.disconnect();
  message.channel.send('🔌 قطع اتصال شد.');
}
player.on(MusicPlayerEvent.Disconnect, () => {
  message.channel.send('🔌 قطع اتصال شد.');
});
```

#### `join(): VoiceConnection`
پیوستن به کانال صوتی بدون اشتراک پخش‌کننده.

**نمونه**:
```typescript
if (command === 'join') {
  const connection = player.join();
  message.channel.send('🔗 به کانال صوتی پیوسته شد.');
}
```

#### `getQueue(): TrackMetadata[]`
کپی صف فعلی را برمی‌گرداند.

**نمونه**:
```typescript
if (command === 'queue') {
  const queue = player.getQueue();
  const list = queue.map((t, i) => `${i + 1}. ${t.title || t.url}`).join('\n');
  message.channel.send(`📃 صف:\n${list || 'خالی'}`);
}
```

#### `getVolume(): number`
بلندی صدای فعلی را برمی‌گرداند.

**نمونه**:
```typescript
if (command === 'volume') {
  message.channel.send(`🔊 صدا: ${player.getVolume()}%`);
}
```

#### `isPlaying(): boolean`
بررسی می‌کند که آیا آهنگی در حال پخش است.

**نمونه**:
```typescript
if (command === 'status') {
  message.channel.send(`🎵 ${player.isPlaying() ? 'در حال پخش' : 'در حال پخش نیست'}.`);
}
```

#### `isPaused(): boolean`
بررسی می‌کند که آیا پخش مکث شده است.

**نمونه**:
```typescript
if (command === 'status') {
  message.channel.send(`⏯️ ${player.isPaused() ? 'مکث شده' : 'مکث نشده'}.`);
}
```

#### `isShuffiled(): boolean`
بررسی می‌کند که آیا صف به‌هم‌ریخته است.

**نمونه**:
```typescript
if (command === 'status') {
  message.channel.send(`🔀 صف ${player.isShuffiled() ? 'به‌هم‌ریخته' : 'به‌هم‌ریخته نیست'}.`);
}
```

#### `isConnected(guildId?: string): boolean`
بررسی می‌کند که آیا به کانال صوتی متصل است.

**نمونه**:
```typescript
if (command === 'status') {
  message.channel.send(`🔗 ${player.isConnected() ? 'متصل' : 'متصل نیست'}.`);
}
```

#### `searchLyrics(title: string, artist?: string): Promise<string | null>`
بازیابی متن آهنگ.

**نمونه**:
```typescript
if (command === 'lyrics') {
  const title = args.join(' ');
  const lyrics = await player.searchLyrics(title, 'artist');
  message.channel.send(lyrics ? `🎵 متن آهنگ:\n${lyrics}` : 'متن آهنگی یافت نشد.');
}
```

## پشتیبانی و مشارکت
- **مخزن**: [https://github.com/Persian-Caesar/discord-player](https://github.com/Persian-Caesar/discord-player)
- **مسائل**: [https://github.com/Persian-Caesar/discord-player/issues](https://github.com/Persian-Caesar/discord-player/issues)
- **جامعه**: برای پشتیبانی به [دیسکورد Persian Caesar](https://dsc.gg/persian-caesar) بپیوندید.
- **مشارکت**: درخواست‌های Pull استقبال می‌شوند! لطفاً دستورالعمل‌های مشارکت در مخزن را دنبال کنید.

## مجوز
این پروژه تحت مجوز MIT منتشر شده است. برای جزئیات، فایل [`LICENSE`](./LICENSE) یا مخزن را ببینید.

---

⌨️ ساخته‌شده با ❤️ توسط **[Sobhan-SRZA](https://github.com/Sobhan-SRZA)** برای **[Persian Caesar](https://github.com/Persian-Caesar)**. اگر مفید بود، به مخزن ستاره دهید!

## تماس
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