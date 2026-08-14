import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { DB, DBManager } from "./database/index";
import { EventEmitter } from "./events/eventEmitter";
import { world, system } from "@minecraft/server";
import { PermissionManager } from "./permissions/permissionManager";
import { loadUIs } from "./ui/index";
import { AutoSaveManager } from "./utils/persistence/autoSaveManager";
export class ServerBootstrap extends EventEmitter {
    _isInitialized = false;
    initAdminUtils() {
        const self = this;
        console.warn(`${JSON.stringify(Array.from(this.ui.forms.keys()))}`);
        system.runJob(function* () {
            yield* DBManager.loadAll();
            yield* loadUIs(self);
            if (DB.LoadData.get("loadedAtLeastOnce") === false) {
                // First time loading
                self.resetConfig();
            }
            if (DB.Permissions.get("-auEnabled")) {
                yield* self.permission.loadPlugin();
            }
            server._isInitialized = true;
            console.warn(`${JSON.stringify(Array.from(self.ui.forms.keys()))}`);
        }());
    }
    get isInitialized() {
        return this._isInitialized;
    }
    resetConfig() {
        DB.Config.clear();
        DB.Config.assignMemory(defaultConfig);
    }
}
class Server extends ServerBootstrap {
    globalAutoSave = new AutoSaveManager(this);
    ui = new UIManager();
    permission = new PermissionManager(this.globalAutoSave);
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
    getAdmins() {
        return Array.from(DB.Server.get("admins") ?? []);
    }
    isAdmin(username) {
        return this.getAdmins().includes(username);
    }
}
export const server = new Server();
server.once("firstLoad", () => {
    server.resetConfig();
});
