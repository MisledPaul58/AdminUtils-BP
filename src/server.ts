import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { database, loadDatabases } from "./database/index";
import { EventEmitter } from "./events/eventEmitter";
import { world, system, RawMessage } from "@minecraft/server";

class ServerBootstrap extends EventEmitter{
    private _isInitialized: boolean = false;

    protected initAdminUtils() {
        system.runJob(function* () {
            yield* loadDatabases();

            server._isInitialized = true;
        }() as Generator<void, void, void>);
    }

    get isInitialized() {
        return this._isInitialized;
    }
}

class Server extends ServerBootstrap {
    public ui: UIManager;

    constructor() {
        super();
        this.ui = new UIManager();
        this.initAdminUtils();
        //TODO inicializar todas las variables como ui fuera de la clase en server.once("ready"), por ejemplo
    }

    /**
     * Send a custom message (AU >> ...) to the world.
     */
    //TODO hacer una interface con todos los posibles nombres de traducciones
    //TODO acortar a sendMsg? para luego hacer algo para mandar mensajes solo a los admins o a los que tengan cierto permiso
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