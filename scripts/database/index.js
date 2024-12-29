import { Database } from "./database";
export let database = {
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
