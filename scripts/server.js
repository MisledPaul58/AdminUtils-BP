import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { database, loadDatabases } from "./database/index";
import { EventEmitter } from "./events/eventEmitter";
import { world, system } from "@minecraft/server";
class ServerBootstrap {
    constructor() {
        this.isInitialized = false;
    }
    initAdminUtils() {
        return new Promise((resolve, reject) => {
            system.runJob(function* () {
                yield* loadDatabases();
                //TODO try catch para resolve o reject? o simplemente un throw
                //TODO cómo calcular el msLoadTime desde aquí?
            }());
        });
    }
}
export const serverBootstrap = new ServerBootstrap();
class Server extends EventEmitter {
    constructor() {
        super();
        this.ui = new UIManager();
        //TODO inicializar todas las variables como ui fuera de la clase en server.once("ready"), por ejemplo
    }
    /**
     * Send a custom message (AU >> ...) to the world.
     */
    sendCustomMessage(msg, args) {
        const rawMessage = {
            translate: msg,
            with: args
        };
        world.sendMessage(['§l§cAU §6>>§r ', rawMessage]);
    }
    fetchDefaultConfig() {
        database.config.clear();
        database.config.assign(defaultConfig);
    }
}
export const server = new Server();
server.once("firstLoad", () => {
    server.fetchDefaultConfig();
});
