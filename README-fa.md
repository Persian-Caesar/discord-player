# @persian-caesar/discord-player

یک پخش‌کننده موسیقی سبک و نوع‌امن برای ربات‌های خودکار دیسکورد، ساخته شده با تایپ‌اسکریپت و یکپارچه با `discord.js`. این بسته شامل کلاس قدرتمند `MusicPlayer` برای پخش صوتی از پلتفرم‌هایی مانند یوتیوب، ساندکلاد، اسپاتیفای و دیزر است، با قابلیت‌هایی نظیر مدیریت صف، تکرار، به‌هم‌ریختن (شافل) و دریافت متن آهنگ.

## فهرست مطالب
- [@persian-caesar/discord-player](#persian-caesardiscord-player)
  - [فهرست مطالب](#فهرست-مطالب)
  - [معرفی](#معرفی)
  - [ویژگی‌ها](#ویژگی‌ها)
  - [نصب](#نصب)
  - [وابستگی‌ها](#وابستگی‌ها)
  - [نمونه‌های استفاده](#نمونه‌های-استفاده)
    - [نمونه تایپ‌اسکریپت](#نمونه-تایپ‌اسکریپت)
    - [نمونه جاوااسکریپت](#نمونه-جاوااسکریپت)
  - [مرجع API](#مرجع-api)
    - [کلاس MusicPlayer](#کلاس-musicplayer)
    - [شمارنده MusicPlayerEvent](#شمارنده-musicplayerevent)
    - [استفاده و نمونه‌های متدها](#استفاده-و-نمونه‌های-متدها)
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
  - [پشتیبانی و مشارکت](#پشتیبانی-و-مشارکت)
  - [مجوز](#مجوز)
  - [تماس](#تماس)

## معرفی
`@persian-caesar/discord-player` برای ساده‌سازی پخش صوتی در ربات‌های دیسکورد طراحی شده است. این بسته از کتابخانه `@discordjs/voice` برای تعامل با کانال‌های صوتی استفاده می‌کند و از پخش از پلتفرم‌های متعددی مانند یوتیوب، ساندکلاد، اسپاتیفای و دیزر پشتیبانی می‌کند، با استفاده از کتابخانه‌هایی مانند `ytdl-core`، `play-dl` و `soundcloud-downloader`. این بسته کاملاً نوع‌بندی شده است و برای پروژه‌های تایپ‌اسکریپت ایده‌آل است، همچنین شامل حاشیه‌نویسی‌های JSDoc برای کاربران جاوااسکریپت می‌باشد. کلاس `MusicPlayer` تمام جنبه‌های پخش موسیقی، از جمله مدیریت صف، ردیابی تاریخچه و اعلان‌های مبتنی بر رویداد را مدیریت می‌کند.

این بسته توسط [Sobhan-SRZA](https://github.com/Sobhan-SRZA) برای [Persian Caesar](https://github.com/Persian-Caesar) توسعه یافته و تحت مجوز MIT منتشر شده و به‌صورت فعال نگهداری می‌شود.

## ویژگی‌ها
- **پخش چندپلتفرمی**: پشتیبانی از یوتیوب، ساندکلاد، اسپاتیفای و دیزر از طریق `ytdl-core`، `play-dl` و `soundcloud-downloader`.
- **مدیریت صف**: افزودن آهنگ‌ها به صف، به‌هم‌ریختن یا بازگرداندن به ترتیب اولیه.
- **گزینه‌های تکرار**: فعال یا غیرفعال کردن تکرار برای یک آهنگ یا کل صف.
- **کنترل صدا**: تنظیم بلندی صدا (0–200٪).
- **دریافت متن آهنگ**: دریافت متن آهنگ از نتایج جستجوی گوگل با استفاده از `html-to-text`.
- **حالت رادیو**: پخش لیست URLهای به‌هم‌ریخته به‌صورت مداوم.
- **سیستم رویداد**: رویدادهای نوع‌بندی‌شده برای وضعیت پخش، تغییرات صف، خطاها و غیره.
- **قطع خودکار**: گزینه‌های قابل تنظیم برای خروج از کانال صوتی در صورت خالی بودن صف یا پس از زمان بی‌فعالی.
- **امنیت نوع**: پشتیبانی کامل از تایپ‌اسکریپت با رابط‌ها و شمارنده‌های تعریف‌شده در `types.ts`.
- **سبک‌وزن**: وابستگی‌های کم با عدم نیاز به چارچوب‌های خارجی به جز `discord.js`.

## نصب
برای نصب بسته:

```bash
npm install @persian-caesar/discord-player
```

اطمینان حاصل کنید که از Node.js نسخه 16 یا بالاتر استفاده می‌کنید، همان‌طور که در `package.json` مشخص شده است.

## وابستگی‌ها
وابستگی‌های زیر برای عملکرد صحیح بسته مورد نیاز هستند:

| بسته                    | نسخه      | هدف                                                                      |
|------------------------|----------|-------------------------------------------------------------------------|
| `@discordjs/voice`     | ^0.18.0  | مدیریت اتصال به کانال‌های صوتی و پخش صوت در دیسکورد.                    |
| `@discordjs/opus`      | ^0.10.0  | ارائه کدگذاری/رمزگشایی صوتی Opus برای پخش با کیفیت بالا.                |
| `ytdl-core`            | ^4.11.5  | پخش صوت از ویدیوهای یوتیوب با پشتیبانی از قابلیت اطمینان.               |
| `ytdl-core-discord`    | ^1.3.1   | کتابخانه جایگزین برای پخش یوتیوب جهت سازگاری.                           |
| `@distube/ytdl-core`   | ^4.16.10 | پخش پیشرفته یوتیوب با قابلیت‌ها و اطمینان بیشتر.                        |
| `play-dl`              | ^1.9.7   | پخش صوت از اسپاتیفای، یوتیوب و دیزر با قابلیت جستجو.                    |
| `soundcloud-downloader`| ^1.0.0   | دانلود و پخش صوت از URLهای ساندکلاد.                                    |
| `html-to-text`         | ^9.0.5   | تبدیل HTML (از جستجوی متن آهنگ گوگل) به متن ساده.                       |
| `libsodium-wrappers`   | ^0.7.15  | مورد نیاز برای رمزنگاری صوتی امن در `@discordjs/voice`.                 |
| `ffmpeg-static`        | (همتا)   | ارائه FFmpeg برای پردازش و تبدیل جریان صوتی.                            |

**چرا این وابستگی‌ها؟**
- `@discordjs/voice` و `@discordjs/opus` هسته اصلی عملکرد صوتی دیسکورد هستند و امکان اتصال به کانال‌ها و پخش صوت را فراهم می‌کنند.
- کتابخانه‌های متعدد پخش یوتیوب (`ytdl-core`، `ytdl-core-discord`، `@distube/ytdl-core`) قابلیت اطمینان و پشتیبانی از عقب‌گرد را تضمین می‌کنند.
- `play-dl` پشتیبانی از اسپاتیفای و دیزر را اضافه می‌کند و دامنه پلتفرم‌های پشتیبانی‌شده را گسترش می‌دهد.
- `soundcloud-downloader` پخش از ساندکلاد، یک پلتفرم موسیقی محبوب، را امکان‌پذیر می‌کند.
- `html-to-text` برای استخراج و تمیز کردن متن آهنگ از نتایج جستجوی گوگل استفاده می‌شود.
- `libsodium-wrappers` و `ffmpeg-static` برای پردازش صوتی امن و کارآمد مورد نیاز هستند.

## نمونه‌های استفاده
در ادامه دو نمونه نشان داده شده است که نحوه یکپارچه‌سازی `@persian-caesar/discord-player` با `discord.js` را در تایپ‌اسکریپت و جاوااسکریپت نشان می‌دهد. این نمونه‌ها فرض می‌کنند که شما یک ربات دیسکورد با `discord.js` راه‌اندازی کرده‌اید.

### نمونه تایپ‌اسکریپت
این نمونه نشان می‌دهد چگونه یک ربات دیسکورد ایجاد کنید که از `MusicPlayer` برای پخش موسیقی در یک کانال صوتی و مدیریت دستورات استفاده می‌کند.

```typescript
import { Client, GatewayIntentBits, TextChannel, VoiceChannel } from 'discord.js';
import { MusicPlayer, MusicPlayerEvent } from '@persian-caesar/discord-player';

// مقداردهی اولیه کلاینت دیسکورد با دسترسی‌های مورد نیاز
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// تنظیمات ربات
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // توکن ربات خود را جایگزین کنید

client.on('ready', () => {
  console.log(`وارد سیستم شد با نام ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  const voiceChannel = message.member.voice.channel as VoiceChannel;
  const player = new MusicPlayer(voiceChannel, 50, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 دقیقه
  });

  // شنونده‌های رویداد برای پخش‌کننده موسیقی
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ به صف اضافه شد: ${metadata.title || metadata.url} (${queue.length} در صف)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ خطا: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ پخش به پایان رسید.');
  });

  // مدیریت دستورات
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('لطفاً یک URL یا عبارت جستجو ارائه دهید.');
      return;
    }
    await player.play(query);
  } else if (command === 'pause') {
    player.pause();
    message.channel.send('⏸️ پخش متوقف شد.');
  } else if (command === 'resume') {
    player.resume();
    message.channel.send('▶️ پخش از سر گرفته شد.');
  } else if (command === 'skip') {
    player.skip();
    message.channel.send('⏭️ به آهنگ بعدی پرش شد.');
  } else if (command === 'stop') {
    player.stop();
    message.channel.send('⏹️ پخش متوقف شد.');
  } else if (command === 'lyrics') {
    const title = args.join(' ');
    if (!title) {
      message.channel.send('لطفاً عنوان آهنگ را ارائه دهید.');
      return;
    }
    const lyrics = await player.searchLyrics(title);
    message.channel.send(lyrics ? `🎵 متن آهنگ:\n${lyrics}` : '❌ متن آهنگ یافت نشد.');
  }
});

client.login(TOKEN);
```

**مراحل اجرا:**
1. کد بالا را به‌عنوان `bot.ts` ذخیره کنید.
2. توکن ربات دیسکورد خود را جایگزین `YOUR_BOT_TOKEN` کنید.
3. اطمینان حاصل کنید که تمام وابستگی‌ها نصب شده‌اند.
4. با استفاده از `tsc bot.ts` کامپایل کنید و با `node bot.js` اجرا کنید.

### نمونه جاوااسکریپت
این نمونه مشابه است اما از جاوااسکریپت ساده با حاشیه‌نویسی‌های JSDoc برای راهنمایی‌های نوع استفاده می‌کند.

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { MusicPlayer, MusicPlayerEvent } = require('@persian-caesar/discord-player');

// مقداردهی اولیه کلاینت دیسکورد با دسترسی‌های مورد نیاز
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// تنظیمات ربات
const PREFIX = '!';
const TOKEN = 'YOUR_BOT_TOKEN'; // توکن ربات خود را جایگزین کنید

client.on('ready', () => {
  console.log(`وارد سیستم شد با نام ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!message.guild || !message.member?.voice.channel) return;

  /** @type {import('@persian-caesar/discord-player').VoiceChannel} */
  const voiceChannel = message.member.voice.channel;
  const player = new MusicPlayer(voiceChannel, 50, {
    autoLeaveOnEmptyQueue: true,
    autoLeaveOnIdleMs: 300_000, // 5 دقیقه
  });

  // شنونده‌های رویداد برای پخش‌کننده موسیقی
  player.on(MusicPlayerEvent.Start, ({ metadata }) => {
    message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
  });

  player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
    message.channel.send(`➕ به صف اضافه شد: ${metadata.title || metadata.url} (${queue.length} در صف)`);
  });

  player.on(MusicPlayerEvent.Error, (error) => {
    message.channel.send(`❌ خطا: ${error.message}`);
  });

  player.on(MusicPlayerEvent.Finish, () => {
    message.channel.send('⏹️ پخش به پایان رسید.');
  });

  // مدیریت دستورات
  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      message.channel.send('لطفاً یک URL یا عبارت جستجو ارائه دهید.');
      return;
    }
    await player.play(query);
  } else if (command === 'pause') {
    player.pause();
    message.channel.send('⏸️ پخش متوقف شد.');
  } else if (command === 'resume') {
    player.resume();
    message.channel.send('▶️ پخش از سر گرفته شد.');
  } else if (command === 'skip') {
    player.skip();
    message.channel.send('⏭️ به آهنگ بعدی پرش شد.');
  } else if (command === 'stop') {
    player.stop();
    message.channel.send('⏹️ پخش متوقف شد.');
  } else if (command === 'lyrics') {
    const title = args.join(' ');
    if (!title) {
      message.channel.send('لطفاً عنوان آهنگ را ارائه دهید.');
      return;
    }
    const lyrics = await player.searchLyrics(title);
    message.channel.send(lyrics ? `🎵 متن آهنگ:\n${lyrics}` : '❌ متن آهنگ یافت نشد.');
  }
});

client.login(TOKEN);
```

**مراحل اجرا:**
1. کد بالا را به‌عنوان `bot.js` ذخیره کنید.
2. توکن ربات دیسکورد خود را جایگزین `YOUR_BOT_TOKEN` کنید.
3. اطمینان حاصل کنید که تمام وابستگی‌ها نصب شده‌اند.
4. با استفاده از `node bot.js` اجرا کنید.

## مرجع API

### کلاس MusicPlayer
**سازنده**:
```typescript
new MusicPlayer(
  channel: VoiceChannel,
  initialVolume?: number, // پیش‌فرض: 100
  options?: MusicPlayerOptions // { autoLeaveOnEmptyQueue?: boolean, autoLeaveOnIdleMs?: number }
)
```

**متدها**:
| متد                                            | توضیحات                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| `play(input: string)`                          | پخش یک آهنگ با URL یا عبارت جستجو، در صورت پخش، به صف اضافه می‌کند. |
| `pause()`                                      | توقف آهنگ در حال پخش.                                    |
| `resume()`                                     | از سرگیری پخش.                                           |
| `setVolume(percent: number)`                   | تنظیم بلندی صدا (0–200٪).                                |
| `skip()`                                       | پرش به آهنگ بعدی در صف.                                  |
| `previous()`                                   | پخش آهنگ قبلی از تاریخچه.                                |
| `shuffle()`                                    | به‌هم‌ریختن صف و ذخیره ترتیب اولیه.                     |
| `undoShuffle()`                                | بازگرداندن صف به ترتیب اولیه، به جز آهنگ‌های پخش‌شده.   |
| `toggleLoopQueue()`                            | فعال/غیرفعال کردن تکرار صف.                              |
| `toggleLoopTrack()`                            | فعال/غیرفعال کردن تکرار تک‌آهنگ.                        |
| `startRadio(urls: string[])`                   | شروع حالت رادیو با URLهای به‌هم‌ریخته.                  |
| `stop(noLeave?: boolean)`                      | توقف پخش، با امکان انتخاب برای قطع اتصال.                |
| `disconnect()`                                 | قطع اتصال از کانال صوتی.                                 |
| `getQueue(): TrackMetadata[]`                  | بازگرداندن کپی از صف فعلی.                              |
| `getVolume(): number`                          | بازگرداندن بلندی صدا فعلی (0–200٪).                     |
| `isPlaying(): boolean`                         | بررسی اینکه آیا آهنگی در حال پخش است.                    |
| `isPaused(): boolean`                          | بررسی اینکه آیا پخش متوقف شده است.                      |
| `isShuffiled(): boolean`                       | بررسی اینکه آیا صف به‌هم‌ریخته است.                     |
| `searchLyrics(title: string, artist?: string)` | دریافت متن آهنگ از گوگل.                                 |

### شمارنده MusicPlayerEvent
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

**بارهای رویداد**:
- `Start`: `{ metadata: TrackMetadata, queue: TrackMetadata[] }`
- `QueueAdd`: `{ metadata: TrackMetadata, queue: TrackMetadata[] }`
- `VolumeChange`: `{ volume: number }`
- `Skip`: `{ queue: TrackMetadata[], history: string[] }`
- `Previous`: `{ metadata: TrackMetadata, queue: TrackMetadata[], history: string[] }`
- `Shuffle`: `{ queue: TrackMetadata[] }`
- `Finish`: `{ queue: TrackMetadata[], history: string[] }`
- `Error`: `Error`
- سایرین: بدون بار

برای تعریف‌های کامل نوع، به `types.ts` مراجعه کنید.

### استفاده و نمونه‌های متدها
این بخش توضیحات مفصل و نمونه‌های کد برای هر متد `MusicPlayer` ارائه می‌دهد و نحوه استفاده از آنها را در زمینه یک ربات دیسکورد با استفاده از `discord.js` نشان می‌دهد. نمونه‌ها فرض می‌کنند که یک نمونه `MusicPlayer` همان‌طور که در بخش [نمونه‌های استفاده](#نمونه‌های-استفاده) نشان داده شده، ایجاد شده است.

#### `play(input: string): Promise<void>`
پخش یک آهنگ با URL یا عبارت جستجو. اگر آهنگی در حال پخش باشد، آهنگ جدید به صف اضافه می‌شود.

**نمونه**:
```typescript
// دستور: !play <query>
if (command === 'play') {
  const query = args.join(' ');
  if (!query) {
    message.channel.send('لطفاً یک URL یا عبارت جستجو ارائه دهید.');
    return;
  }
  await player.play(query);
  // رویدادهای Start یا QueueAdd پاسخ را مدیریت می‌کنند
}
player.on(MusicPlayerEvent.Start, ({ metadata }) => {
  message.channel.send(`▶️ در حال پخش: ${metadata.title || metadata.url}`);
});
player.on(MusicPlayerEvent.QueueAdd, ({ metadata, queue }) => {
  message.channel.send(`➕ به صف اضافه شد: ${metadata.title || metadata.url} (${queue.length} در صف)`);
});
```

#### `pause(): void`
توقف آهنگ در حال پخش.

**نمونه**:
```typescript
if (command === 'pause') {
  player.pause();
  message.channel.send('⏸️ پخش متوقف شد.');
}
player.on(MusicPlayerEvent.Pause, () => {
  message.channel.send('⏸️ پخش متوقف شد.');
});
```

#### `resume(): void`
از سرگیری پخش آهنگ متوقف‌شده.

**نمونه**:
```typescript
if (command === 'resume') {
  player.resume();
  message.channel.send('▶️ پخش از سر گرفته شد.');
}
player.on(MusicPlayerEvent.Resume, () => {
  message.channel.send('▶️ پخش از سر گرفته شد.');
});
```

#### `setVolume(percent: number): void`
تنظیم بلندی صدا (0–200٪). مقادیر خارج از این محدوده به 200٪ محدود می‌شوند.

**نمونه**:
```typescript
if (command === 'volume') {
  const volume = parseInt(args[0]);
  if (isNaN(volume)) {
    message.channel.send('لطفاً یک مقدار معتبر برای صدا (0–200) ارائه دهید.');
    return;
  }
  player.setVolume(volume);
  // رویداد VolumeChange پاسخ را مدیریت می‌کند
}
player.on(MusicPlayerEvent.VolumeChange, ({ volume }) => {
  message.channel.send(`🔊 صدا تنظیم شد به ${volume}%`);
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
  message.channel.send(`⏭️ پرش انجام شد. ${queue.length} آهنگ در صف باقی مانده.`);
});
```

#### `previous(): Promise<void>`
پخش آهنگ قبلی از تاریخچه، در صورت وجود.

**نمونه**:
```typescript
if (command === 'previous') {
  await player.previous();
  // رویداد Previous پاسخ را مدیریت می‌کند
}
player.on(MusicPlayerEvent.Previous, ({ metadata }) => {
  message.channel.send(`⏮️ پخش آهنگ قبلی: ${metadata.title || metadata.url}`);
});
player.on(MusicPlayerEvent.Error, (error) => {
  if (error.message.includes('No track to previous')) {
    message.channel.send('❌ آهنگ قبلی در دسترس نیست.');
  }
});
```

#### `shuffle(): void`
به‌هم‌ریختن صف و ذخیره ترتیب اولیه برای بازگرداندن احتمالی.

**نمونه**:
```typescript
if (command === 'shuffle') {
  player.shuffle();
  message.channel.send('🔀 صف به‌هم‌ریخته شد.');
}
player.on(MusicPlayerEvent.Shuffle, ({ queue }) => {
  message.channel.send(`🔀 صف به‌هم‌ریخته شد. ${queue.length} آهنگ در ترتیب جدید.`);
});
```

#### `undoShuffle(): void`
بازگرداندن صف به ترتیب اولیه، به جز آهنگ‌های پخش‌شده.

**نمونه**:
```typescript
if (command === 'unshuffle') {
  player.undoShuffle();
  message.channel.send('🔄 صف به ترتیب اولیه بازگردانده شد.');
}
player.on(MusicPlayerEvent.Shuffle, ({ queue }) => {
  message.channel.send(`🔄 صف بازگردانده شد. ${queue.length} آهنگ در صف.`);
});
```

#### `toggleLoopQueue(): void`
فعال/غیرفعال کردن تکرار صف.

**نمونه**:
```typescript
if (command === 'loopqueue') {
  player.toggleLoopQueue();
  message.channel.send(`🔁 تکرار صف ${player.isLoopQueue() ? 'فعال' : 'غیرفعال'} شد.`);
}
```

#### `toggleLoopTrack(): void`
فعال/غیرفعال کردن تکرار تک‌آهنگ.

**نمونه**:
```typescript
if (command === 'looptrack') {
  player.toggleLoopTrack();
  message.channel.send(`🔂 تکرار آهنگ ${player.isLoopTrack() ? 'فعال' : 'غیرفعال'} شد.`);
}
```

#### `startRadio(urls: string[]): Promise<void>`
شروع حالت رادیو با به‌هم‌ریختن لیست URLها و پخش مداوم آنها.

**نمونه**:
```typescript
if (command === 'radio') {
  const urls = args; // آرایه URLها
  if (!urls.length) {
    message.channel.send('لطفاً حداقل یک URL ارائه دهید.');
    return;
  }
  await player.startRadio(urls);
  // رویداد Start پاسخ را مدیریت می‌کند
}
player.on(MusicPlayerEvent.Start, ({ metadata }) => {
  message.channel.send(`📻 حالت رادیو شروع شد: ${metadata.title || metadata.url}`);
});
```

#### `stop(noLeave?: boolean): void`
توقف پخش، پاک کردن صف و تاریخچه، و به‌صورت اختیاری قطع اتصال از کانال صوتی.

**نمونه**:
```typescript
if (command === 'stop') {
  player.stop(true); // در کانال صوتی باقی بمانید
  message.channel.send('⏹️ پخش متوقف شد.');
}
player.on(MusicPlayerEvent.Stop, () => {
  message.channel.send('⏹️ پخش متوقف شد.');
});
```

#### `disconnect(): void`
قطع اتصال ربات از کانال صوتی و پاک کردن تمام منابع.

**نمونه**:
```typescript
if (command === 'disconnect') {
  player.disconnect();
  message.channel.send('🔌 از کانال صوتی قطع شد.');
}
player.on(MusicPlayerEvent.Disconnect, () => {
  message.channel.send('🔌 از کانال صوتی قطع شد.');
});
```

#### `getQueue(): TrackMetadata[]`
بازگرداندن کپی از صف فعلی به‌صورت آرایه‌ای از `TrackMetadata`.

**نمونه**:
```typescript
if (command === 'queue') {
  const queue = player.getQueue();
  if (!queue.length) {
    message.channel.send('📃 صف خالی است.');
    return;
  }
  const queueList = queue.map((track, index) => `${index + 1}. ${track.title || track.url}`).join('\n');
  message.channel.send(`📃 صف:\n${queueList}`);
}
```

#### `getVolume(): number`
بازگرداندن بلندی صدا فعلی به‌صورت درصد (0–200٪).

**نمونه**:
```typescript
if (command === 'volume') {
  const currentVolume = player.getVolume();
  message.channel.send(`🔊 بلندی صدا فعلی: ${currentVolume}%`);
}
```

#### `isPlaying(): boolean`
بررسی اینکه آیا آهنگی در حال پخش است.

**نمونه**:
```typescript
if (command === 'status') {
  const status = player.isPlaying() ? 'در حال پخش' : 'در حال پخش نیست';
  message.channel.send(`🎵 وضعیت پخش‌کننده: ${status}`);
}
```

#### `isPaused(): boolean`
بررسی اینکه آیا پخش متوقف شده است.

**نمونه**:
```typescript
if (command === 'status') {
  const paused = player.isPaused() ? 'متوقف' : 'متوقف نیست';
  message.channel.send(`⏯️ وضعیت پخش: ${paused}`);
}
```

#### `isShuffiled(): boolean`
بررسی اینکه آیا صف به‌هم‌ریخته است.

**نمونه**:
```typescript
if (command === 'status') {
  const shuffled = player.isShuffiled() ? 'به‌هم‌ریخته' : 'به‌هم‌ریخته نیست';
  message.channel.send(`🔀 وضعیت صف: ${shuffled}`);
}
```

#### `searchLyrics(title: string, artist?: string): Promise<string | null>`
دریافت متن آهنگ از گوگل بر اساس عنوان ارائه‌شده و خواننده اختیاری.

**نمونه**:
```typescript
if (command === 'lyrics') {
  const title = args.join(' ');
  if (!title) {
    message.channel.send('لطفاً عنوان آهنگ را ارائه دهید.');
    return;
  }
  const lyrics = await player.searchLyrics(title);
  message.channel.send(lyrics ? `🎵 متن آهنگ:\n${lyrics}` : '❌ متن آهنگ یافت نشد.');
}
```

## پشتیبانی و مشارکت
- **مخزن**: [https://github.com/Persian-Caesar/discord-player](https://github.com/Persian-Caesar/discord-player)
- **گزارش مشکلات**: [https://github.com/Persian-Caesar/discord-player/issues](https://github.com/Persian-Caesar/discord-player/issues)
- **جامعه**: برای پشتیبانی به [دیسکورد Persian Caesar](https://dsc.gg/persian-caesar) بپیوندید.
- **مشارکت**: درخواست‌های کشش (Pull Requests) خوش‌آمد هستند! لطفاً دستورالعمل‌های مشارکت در مخزن را دنبال کنید.

## مجوز
این پروژه تحت مجوز MIT منتشر شده است. برای جزئیات، فایل `[LICENSE](./LICENSE)` یا مخزن را ببینید.

---

⌨️ ساخته شده با ❤️ توسط **[Sobhan-SRZA](https://github.com/Sobhan-SRZA)** برای **[Persian Caesar](https://github.com/Persian-Caesar)**. اگر مفید بود، به مخزن ستاره دهید!

## تماس
<div align="center">
  <a href="https://srza.ir" target="_blank">
   <img align="left" src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/social.png" alt="شبکه‌های اجتماعی Sobhan-SRZA" width=400px>
  </a>

  <a href="https://t.me/d_opa_mine" target="_blank">
   <img alt="تلگرام"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/telegram-ch.svg"
    height="30" />
  </a>

  <a href="https://t.me/Sobhan_SRZA" target="_blank">
   <img alt="تلگرام"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/telegram-ac.svg"
    height="30" />
  </a>

  <a href="https://www.instagram.com/mr.sinre?igsh=cWk1aHdhaGRnOGg%3D&utm_source=qr" target="_blank">
   <img alt="اینستاگرام"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/instagram.svg"
    height="30" />
  </a>

  <a href="https://www.twitch.tv/sobhan_srza" target="_blank">
   <img alt="توییچ"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/twitch.svg"
    height="30" />
  </a>

  <a href="https://www.youtube.com/@mr_sinre?app=desktop&sub_confirmation=1" target="_blank">
   <img alt="یوتیوب"
    src="https://raw.githubusercontent.com/Sobhan-SRZA/Sobhan-SRZA/refs/heads/main/images/youtube.svg"
    height="30" />
  </a>
  
  <a href="https://github.com/Sobhan-SRZA" target="_blank">
   <img alt="گیتهاب"
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
    <img alt="حساب دیسکورد من" src="https://discord.c99.nl/widget/theme-1/865630940361785345.png" />
   </a>
    <a href="https://discord.com/users/986314682547716117" target="_blank" align="right">
    <img alt="حساب دیسکورد تیم" src="https://discord.c99.nl/widget/theme-1/986314682547716117.png" />
   </a>
  </div>

</div>