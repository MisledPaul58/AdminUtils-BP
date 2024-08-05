import { Database } from "./database";

/**
 * @type { { loaded: Boolean, freeCam: Database, playerData: Database } }
 */
export let database = {
    loaded: false
};

database.loadData = new Database("LoadData");

database.config = new Database("Config");
database.playerData = new Database("PlayerData");
database.freeCam = new Database("Freecam");

database.loaded = true;

// for (const db in database) {
//     if (db === "loaded") continue;
//     database[db].deleteAll();
// }