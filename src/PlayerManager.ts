import {
    VoiceChannel,
    MusicPlayerOptions,
    MusicPlayerEvent,
    TextChannel
} from "./types";
import { MusicPlayer } from "./MusicPlayer";

export class PlayerManager {
    private static players: Map<string, MusicPlayer> = new Map();

    public static getOrCreatePlayer(
        guildId: string,
        channel?: VoiceChannel,
        textChannel?: TextChannel,
        options?: MusicPlayerOptions
    ): MusicPlayer {
        let player = this.players.get(guildId);
        if (!player) {
            player = new MusicPlayer(channel!, textChannel!, options);
            this.players.set(guildId, player);
            player.on(MusicPlayerEvent.Disconnect as any, () => {
                this.players.delete(guildId);
            });
        }

        else if (player.channel!.id !== channel!.id) {
            player.setData({
                channelId: channel!.id,
                guildId: channel!.guild.id,
                adapterCreator: channel!.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });
            player.disconnect();
        }

        return player;
    }

    public static getPlayer(guildId: string): MusicPlayer | undefined {
        return this.players.get(guildId);
    }

    public static removePlayer(guildId: string): void {
        const player = this.players.get(guildId);
        if (player) {
            player.disconnect();
            this.players.delete(guildId);
        }
    }
}
/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */