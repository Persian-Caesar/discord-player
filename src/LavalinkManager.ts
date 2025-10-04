import {
    Client,
    GatewayDispatchEvents,
    LavalinkManagerType,
    LavalinkManagerOptions
} from "./types";
import {
    Manager,
    ManagerOptions
} from "erela.js";

export function LavalinkManager(client: Client, options: LavalinkManagerOptions): LavalinkManagerType {
    if (!options.send)
        options.send = (id, payload) => {
            const guild = client.guilds.cache.get(id);
            if (guild)
                guild.shard.send(payload);
        }

    const manager = new Manager(options as ManagerOptions);

    client.once("ready", () => manager.init(client.user?.id))
    client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (data) => manager.updateVoiceState(data));
    client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) => manager.updateVoiceState(data));

    return manager;
}

/**
 * @copyright
 * Code by Sobhan-SRZA (mr.sinre) | https://github.com/Sobhan-SRZA
 * Developed for Persian Caesar | https://github.com/Persian-Caesar | https://dsc.gg/persian-caesar
 *
 * If you encounter any issues or need assistance with this code,
 * please make sure to credit "Persian Caesar" in your documentation or communications.
 */