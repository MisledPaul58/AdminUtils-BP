import { Database } from "./database";
// export type GenericSchema = Record<string, any>;
export var DatabaseName;
(function (DatabaseName) {
    DatabaseName["LoadData"] = "LoadData";
    DatabaseName["Server"] = "Server";
    DatabaseName["Config"] = "Config";
    DatabaseName["PlayerData"] = "PlayerData";
    DatabaseName["Freecam"] = "Freecam";
    DatabaseName["Permissions"] = "Permissions";
})(DatabaseName || (DatabaseName = {}));
export let database = {
    loaded: false
};
export function* loadDatabases() {
    yield database.loadData = new Database(DatabaseName.LoadData);
    yield* database.loadData.fetch();
    yield database.server = new Database(DatabaseName.Server);
    yield* database.server.fetch();
    yield database.config = new Database(DatabaseName.Config);
    yield* database.config.fetch();
    yield database.playerData = new Database(DatabaseName.PlayerData);
    yield* database.playerData.fetch();
    yield database.freeCam = new Database(DatabaseName.Freecam);
    yield* database.freeCam.fetch();
    yield database.permissions = new Database(DatabaseName.Permissions);
    yield* database.permissions.fetch();
    yield database.loaded = true;
}
// class DatabaseManager {
//     public loaded: boolean = false;
//
//     public readonly tables = {
//         LoadData: new Database<GenericSchema>("LoadData"),
//         Server: new Database<GenericSchema>("Server"),
//         Config: new Database<ConfigSchema>("Config"),
//         PlayerData: new Database<PlayerDataSchema>("PlayerData"),
//         Freecam: new Database<GenericSchema>("Freecam"),
//         Permissions: new Database<PermissionsSchema>("Permissions")
//     };
//
//     public *loadAll() {
//         yield* this.tables.LoadData.fetch();
//         yield* this.tables.Server.fetch();
//         yield* this.tables.Config.fetch();
//         yield* this.tables.PlayerData.fetch();
//         yield* this.tables.Freecam.fetch();
//         yield* this.tables.Permissions.fetch();
//
//         this.loaded = true;
//         console.warn("[DATABASE] All databases have been loaded successfully.");
//     }
// }
//
// export const DBManager = new DatabaseManager();
//
// export const DB = DBManager.tables;
