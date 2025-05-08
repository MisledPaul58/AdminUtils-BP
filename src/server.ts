import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { database, loadDatabases } from "./database/index";
import { EventEmitter } from "./events/eventEmitter";
import { world, Player, system, RawMessage } from "@minecraft/server";

class ServerBootstrap {
    private isInitialized: boolean = false;

    public initAdminUtils() {
        return new Promise<void>((resolve, reject) => {
            system.runJob(function* () {
                yield* loadDatabases() as Generator<void, void, void>;

                //TODO try catch para resolve o reject? o simplemente un throw
                //TODO cómo calcular el msLoadTime desde aquí?
            }());
        });
    }
}

export const serverBootstrap = new ServerBootstrap();

class Server extends EventEmitter {
    public ui: UIManager;

    constructor() {
        super();
        this.ui = new UIManager();
        //TODO inicializar todas las variables como ui fuera de la clase en server.once("ready"), por ejemplo
    }

    /**
     * Send a custom message (AU >> ...) to the world.
     */
    sendCustomMessage(msg: string, args?: RawMessage | string[]): void {
        const rawMessage: RawMessage = {
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