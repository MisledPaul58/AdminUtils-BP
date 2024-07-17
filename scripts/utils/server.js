import { world, Player } from "@minecraft/server";
import { UI } from "../ui/builder";

class Server {
    ui = UI;
    /**
     * Send a custom message (AU >> ...) to the world.
     * @param { String } msg
     * @param { Array } args
     */
    sendCustomMessage(msg, args) {
        const rawMessage = {
            translate: msg,
            with: args
        };
        world.sendMessage(['§l§cAU §6>>§r ', rawMessage]);
    }
}

export const server = new Server();