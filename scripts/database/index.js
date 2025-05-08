import { Database } from "./database";
export var DatabaseName;
(function (DatabaseName) {
    DatabaseName["LoadData"] = "LoadData";
    DatabaseName["Config"] = "Config";
    DatabaseName["PlayerData"] = "PlayerData";
    DatabaseName["Freecam"] = "Freecam";
})(DatabaseName || (DatabaseName = {}));
export let database = {
    loaded: false
};
export function* loadDatabases() {
    yield database.loadData = new Database(DatabaseName.LoadData);
    yield* database.loadData.fetch();
    yield database.config = new Database(DatabaseName.Config);
    yield* database.config.fetch();
    yield database.playerData = new Database(DatabaseName.PlayerData);
    yield* database.playerData.fetch();
    yield database.freeCam = new Database(DatabaseName.Freecam);
    yield* database.freeCam.fetch();
    yield database.loaded = true;
}
// for (const db in database) {
//     if (db === "loaded") continue;
//     database[db].deleteAll();
// }
