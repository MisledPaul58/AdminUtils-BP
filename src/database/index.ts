import { Database } from "./database";

export type DatabaseName = "LoadData" | "Config" | "PlayerData" | "Freecam";

interface DatabaseI {
    loaded: boolean,
    loadData: Database,
    config: Database,
    playerData: Database,
    freeCam: Database
}

export let database: DatabaseI = {
    loaded: false,

    loadData: new Database("LoadData"),

    config: new Database("Config"),
    playerData: new Database("PlayerData"),
    freeCam: new Database("Freecam")
};

database.loaded = true;

// for (const db in database) {
//     if (db === "loaded") continue;
//     database[db].deleteAll();
// }