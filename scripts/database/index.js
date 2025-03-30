import { Database } from "./database";

/**
 * @type { { loaded: Boolean, config: Database, playerData: Database, freecam: Database } }
 */
export let database = {
    loaded: false
};

export function* loadDatabases() {
    yield database.loadData = new Database("LoadData");
    yield* database.loadData.fetch();

    yield database.config = new Database("Config");
    yield* database.config.fetch();

    yield database.playerData = new Database("PlayerData");
    yield* database.playerData.fetch();

    yield database.freeCam = new Database("Freecam");
    yield* database.freeCam.fetch();

    yield database.loaded = true;
}