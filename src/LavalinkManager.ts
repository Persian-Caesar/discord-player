import {
    Client,
    GatewayDispatchEvents
} from "./types";
import {
    Manager,
    ManagerOptions
} from "erela.js";

export class LavalinkManager {
    public manager: Manager;
    constructor(
        client: Client,
        options: ManagerOptions
    ) {
        this.manager = new Manager(options);

        client.once("ready", () => this.manager.init(client.user?.id))
        client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (data) => this.manager.updateVoiceState(data));
        client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) => this.manager.updateVoiceState(data));
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