import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { database, loadDatabases } from "./database/index";
import { EventEmitter } from "./events/eventEmitter";
import { world, system } from "@minecraft/server";
import { PermissionManager } from "./permissions/permissionManager";
import { loadUIs } from "./ui/index";
export class ServerBootstrap extends EventEmitter {
    _isInitialized = false;
    initAdminUtils() {
        const self = this;
        console.warn(`${JSON.stringify(Array.from(this.ui.forms.keys()))}`);
        system.runJob(function* () {
            yield* loadDatabases();
            yield* loadUIs(self);
            server._isInitialized = true;
            console.warn(`${JSON.stringify(Array.from(self.ui.forms.keys()))}`);
        }());
    }
    get isInitialized() {
        return this._isInitialized;
    }
}
class Server extends ServerBootstrap {
    // public readonly autoSave = new AutoSaveManager(); //TODO pasarle this? para server server.tick y eso
    ui = new UIManager();
    permission = new PermissionManager();
    constructor() {
        super();
        this.initAdminUtils();
        //TODO inicializar todas las variables como ui fuera de la clase en server.once("ready"), por ejemplo
    }
    /**
     * Send a custom message (AU >> ...) to the world.
     */
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
        database.config.assignMemory(defaultConfig);
    }
}
export const server = new Server();
server.once("firstLoad", () => {
    server.fetchDefaultConfig();
});
