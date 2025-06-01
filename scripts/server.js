import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { database, loadDatabases } from "./database/index";
import { EventEmitter } from "./events/eventEmitter";
import { world, system } from "@minecraft/server";
class ServerBootstrap extends EventEmitter {
    constructor() {
        super(...arguments);
        this._isInitialized = false;
    }
    initAdminUtils() {
        system.runJob(function* () {
            yield* loadDatabases();
            server._isInitialized = true;
        }());
    }
    get isInitialized() {
        return this._isInitialized;
    }
}
class Server extends ServerBootstrap {
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
