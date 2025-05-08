"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicPlayer = void 0;
const voice_1 = require("@discordjs/voice");
const types_1 = require("./types");
const ytdl_core_discord_1 = __importDefault(require("ytdl-core-discord"));
const events_1 = __importDefault(require("events"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const play_dl_1 = __importDefault(require("play-dl"));
const ytdl_core_2 = __importDefault(require("@distube/ytdl-core"));
const soundcloud_downloader_1 = __importDefault(require("soundcloud-downloader"));
class MusicPlayer extends events_1.default {
    constructor(channel, initialVolume = 0.5, options = {}) {
        var _a, _b;
        super();
        this.channel = channel;
        this.connection = null;
        this.queue = [];
        this.history = [];
        this.loopQueue = false;
        this.loopTrack = false;
        this.playing = false;
        this.idleTimer = null;
        this.player = (0, voice_1.createAudioPlayer)();
        this.volume = initialVolume;
        this.autoLeaveOnEmptyQueue = (_a = options.autoLeaveOnEmptyQueue) !== null && _a !== void 0 ? _a : true;
        this.autoLeaveOnIdleMs = (_b = options.autoLeaveOnIdleMs) !== null && _b !== void 0 ? _b : 5 * 60000;
        this.player.on("error", err => {
            this.emit(types_1.MusicPlayerEvent.Error, this.createError("Player have error => " + err.message));
        });
        this.player.on(voice_1.AudioPlayerStatus.Idle, () => this.onIdle());
        this.player.on(voice_1.AudioPlayerStatus.Playing, () => this.clearIdleTimer());
    }
    startIdleTimer() {
        if (this.autoLeaveOnIdleMs > 0 && !this.idleTimer && !this.playing) {
            this.idleTimer = setTimeout(() => {
                this.emit(types_1.MusicPlayerEvent.Disconnect);
                this.disconnect();
            }, this.autoLeaveOnIdleMs);
            return;
        }
        return;
    }
    clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
            return;
        }
        return;
    }
    async ensureConnection() {
        if (!this.connection) {
            this.connection = (0, voice_1.joinVoiceChannel)({
                channelId: this.channel.id,
                guildId: this.channel.guild.id,
                adapterCreator: this.channel.guild.voiceAdapterCreator
            });
            try {
                await (0, voice_1.entersState)(this.connection, voice_1.VoiceConnectionStatus.Ready, 20000);
                this.connection.subscribe(this.player);
            }
            catch {
                this.connection.destroy();
                this.connection = null;
                this.emit(types_1.MusicPlayerEvent.Error, this.createError("Can't connect to the voice channel."));
            }
        }
    }
    async search(query) {
        if (/^https?:\/\//.test(query))
            return query;
        // soundcloud
        const sc_results = await soundcloud_downloader_1.default.search({
            query,
            resourceType: "tracks",
            limit: 1
        });
        let url = sc_results.collection[0].permalink_url;
        if (!url) {
            // spotify youtube and also soundcloud
            const playdl_results = await play_dl_1.default.search(query, {
                limit: 1,
                source: {
                    spotify: "track",
                    soundcloud: "tracks",
                    youtube: "video",
                    deezer: "track"
                }
            });
            url = playdl_results[0].url;
        }
        return url;
    }
    async createStreamFromScdl(url) {
        return await soundcloud_downloader_1.default.download(url);
    }
    async createStreamFromYtdl(url) {
        const options = { filter: "audioonly", highWaterMark: 1 << 25 };
        let stream = null;
        try {
            stream = await (0, ytdl_core_2.default)(url, options);
        }
        catch { }
        ;
        if (!stream)
            try {
                stream = await (0, ytdl_core_1.default)(url, options);
            }
            catch { }
        ;
        if (!stream)
            try {
                stream = await (0, ytdl_core_discord_1.default)(url, options);
            }
            catch { }
        return stream;
    }
    async createStreamFromPlayDl(url) {
        const yt = await play_dl_1.default.stream(url, { quality: 2 });
        if (!yt)
            return null;
        return yt.stream;
    }
    async playUrl(url) {
        var _a;
        this.playing = true;
        this.history.push(url);
        let stream = null;
        if (/^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url))
            try {
                stream = await this.createStreamFromScdl(url);
            }
            catch { }
        ;
        if (/^https?:\/\/open\.spotify\.com\/(track|album|playlist)\//.test(url))
            if (!stream)
                try {
                    stream = await this.createStreamFromPlayDl(url);
                }
                catch { }
        ;
        if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url))
            if (!stream)
                try {
                    stream = await this.createStreamFromYtdl(url);
                }
                catch { }
        ;
        const resource = (0, voice_1.createAudioResource)(stream, { inlineVolume: true });
        (_a = resource.volume) === null || _a === void 0 ? void 0 : _a.setVolume(this.volume);
        this.player.play(resource);
        if (!this.player.state.resource)
            this.player.state.resource = resource;
        this.emit(types_1.MusicPlayerEvent.Start, { url, history: [...this.history] });
        return;
    }
    async play(input) {
        await this.ensureConnection();
        const url = await this.search(input);
        if (this.playing) {
            this.queue.push(url);
            this.emit(types_1.MusicPlayerEvent.QueueAdd, { url, queue: [...this.queue] });
            return undefined;
        }
        else
            return await this.playUrl(url);
    }
    pause() {
        this.player.pause();
        this.emit(types_1.MusicPlayerEvent.Pause);
    }
    resume() {
        this.player.unpause();
        this.emit(types_1.MusicPlayerEvent.Resume);
    }
    setVolume(percent) {
        percent /= 100;
        if (percent < 0 || percent > 2)
            this.volume = 2;
        else
            this.volume = percent;
        const resource = this.player.state.resource;
        try {
            resource.volume.setVolume(this.volume);
        }
        catch { }
        this.emit(types_1.MusicPlayerEvent.VolumeChange, { volume: Math.round(this.volume * 100) });
    }
    async onIdle() {
        if (this.loopTrack)
            return await this.playUrl(this.history[this.history.length - 1]);
        if (this.queue.length) {
            const next = this.queue.shift();
            if (this.loopQueue)
                this.queue.push(next);
            return await this.playUrl(next);
        }
        this.playing = false;
        this.emit(types_1.MusicPlayerEvent.Finish, { history: [...this.history] });
        if (this.autoLeaveOnEmptyQueue) {
            this.emit(types_1.MusicPlayerEvent.Disconnect);
            this.disconnect();
            return;
        }
        else
            return this.startIdleTimer();
    }
    skip() {
        this.emit(types_1.MusicPlayerEvent.Skip, { history: [...this.history] });
        this.player.stop();
    }
    previous() {
        if (this.history.length < 2) {
            this.emit(types_1.MusicPlayerEvent.Error, this.createError("No track to previous."));
            return;
        }
        this.emit(types_1.MusicPlayerEvent.Previous, { history: [...this.history] });
        this.queue.unshift(this.history.pop());
        const prev = this.history.pop();
        this.playUrl(prev);
    }
    shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }
    toggleLoopQueue() {
        this.loopQueue = !this.loopQueue;
    }
    isLoopQueue() {
        return this.loopQueue;
    }
    toggleLoopTrack() {
        this.loopTrack = !this.loopTrack;
    }
    isLoopTrack() {
        return this.loopTrack;
    }
    disconnect() {
        var _a;
        this.clearIdleTimer();
        (_a = this.player) === null || _a === void 0 ? void 0 : _a.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
        this.playing = false;
        this.queue = [];
        this.history = [];
        this.emit(types_1.MusicPlayerEvent.Disconnect);
    }
    stop(noLeave = true) {
        this.emit(types_1.MusicPlayerEvent.Stop);
        this.player.stop();
        this.playing = false;
        this.queue = [];
        this.history = [];
        this.clearIdleTimer();
        if (!noLeave)
            this.disconnect();
        return;
    }
    getQueue() {
        return [...this.queue];
    }
    getVolume() {
        const resource = this.player.state.resource;
        if (resource && resource.volume && resource.volume.volume)
            return Math.round(resource.volume.volume * 100);
        return Math.round(this.volume * 100);
    }
    createError(message) {
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
exports.MusicPlayer = MusicPlayer;
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */ 
