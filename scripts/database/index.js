import { Database } from "./database";
class DatabaseManager {
    loaded = false;
    tables = {
        LoadData: new Database("LoadData"),
        Server: new Database("Server"),
        Config: new Database("Config"),
        PlayerData: new Database("PlayerData"),
        Freecam: new Database("Freecam"),
        Permissions: new Database("Permissions")
    };
    *loadAll() {
        yield* this.tables.LoadData.fetch();
        yield* this.tables.Server.fetch();
        yield* this.tables.Config.fetch();
        yield* this.tables.PlayerData.fetch();
        yield* this.tables.Freecam.fetch();
        yield* this.tables.Permissions.fetch();
        this.loaded = true;
        console.warn("[DATABASE] All databases have been loaded successfully.");
    }
}
export const DBManager = new DatabaseManager();
export const DB = DBManager.tables;
