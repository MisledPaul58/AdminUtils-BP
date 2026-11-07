import { UIManager } from "./ui/builder";
import { defaultConfig } from "./config/defaultConfig";
import { DB, DBManager } from "./database/databaseManager";
import { EventEmitter } from "./events/eventEmitter";
import { world, system, RawMessage } from "@minecraft/server";
import { TranslationsType } from "./utils/translations";
import { PermissionManager } from "./permissions/permissionManager";
import { loadUIs } from "./ui/index";
import { AutoSaveManager } from "./utils/persistence/autoSaveManager";
import { backups, BackupResult } from "./database/backups";

export abstract class ServerBootstrap extends EventEmitter {
    private _isInitialized: boolean = false;
    public abstract ui: UIManager;
    public abstract permission: PermissionManager;

    protected initAdminUtils() {
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
        }() as Generator<void, void, void>);
    }

    get isInitialized() {
        return this._isInitialized;
    }

    abstract resetConfig(): void;
}

class Server extends ServerBootstrap {
    public readonly globalAutoSave = new AutoSaveManager(this);

    public ui: UIManager = new UIManager();
    public permission: PermissionManager = new PermissionManager(this, this.globalAutoSave);

    constructor() {
        super();
        this.initAdminUtils();
        this.once("ready", () => backups.startAutoBackup());
        //TODO inicializar todas las variables como ui fuera de la clase en server.once("ready"), por ejemplo
    }

    resetConfig() {
        DB.Config.clear();
        DB.Config.assignMemory(defaultConfig);
    }

    /**
     * Restores a database backup and notifies listeners (auto-save, plugins) so
     * they can drop cached state. Centralised here so callers don't need to know
     * which systems cache database data; new plugins can subscribe to
     * "databaseRestored".
     */
    public restoreDatabase(slot: number): BackupResult {
        const result = backups.restore(slot);
        if (result.ok) this.emit("databaseRestored");
        return result;
    }

    /**
     * Send a custom message (AU >> ...) to the world.
     */
    //TODO acortar a sendMsg? para luego hacer algo para mandar mensajes solo a los admins o a los que tengan cierto permiso
    sendCustomMessage(msg: TranslationsType, args?: RawMessage | string[]): void {
        const rawMessage: RawMessage = {
            translate: msg,
            with: args
        };
        world.sendMessage(['§l§cAU §6>>§r ', rawMessage]);
    }

    getAdmins(): string[] {
        return Array.from(DB.Server.get("admins") ?? []);
    }

    isAdmin(username: string) {
        return this.getAdmins().includes(username);
    }

    isValidUsername(username: string): boolean {
        return !(/^ | $/.test(username) || /[^A-Za-z0-9À-ÿ\u00f1\u00d1 \(\)]+/.test(username) || username === "");
    }
}

export const server = new Server();

server.once("firstLoad", () => {
    server.resetConfig();
});
