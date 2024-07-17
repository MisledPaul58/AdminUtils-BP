import { world } from "@minecraft/server";
import { Database } from "./database";

/**
 * @type { { loaded: Boolean, freeCam: Database, playerData: Database } }
 */
export let databases = {
    loaded: false
};

world.afterEvents.worldInitialize.subscribe(event => {
    databases.freeCam = new Database("Freecam");
    databases.playerData = new Database("PlayerData");

    databases.loaded = true;
});