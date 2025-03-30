import { server } from "../server";
import { system, world } from "@minecraft/server";
import { loadDatabases, database } from "../database/index";

let worldReady = false;
let dbReady = false;
let tickCount = 0;
let previousTime = Date.now();

system.runInterval(() => {
    tickCount++;
    if (!worldReady && (world.getAllPlayers().length || tickCount >= 200)) {
        worldReady = true;
        initAdminUtils();
    }

    if (worldReady && dbReady) {
        /**
         * Emit to "tick" event.
         */
        server.emit("tick", { currentTick: tickCount });
    }
}, 1);

function initAdminUtils() {
    system.runJob(function* () {
        yield* loadDatabases();

        const msLoadTime = Date.now() - previousTime;
        /**
         * Emit to "ready" event.
         */
        yield server.emit("ready", { tickLoadTime: tickCount, msLoadTime });
        yield database.loadData
            .set("ready", true)
            .set("lastTickLoadTime", tickCount)
            .set("lastMsLoadTime", msLoadTime);

        const firstLoad = database.loadData.get("loadedAtLeastOnce");
        if (!firstLoad) {
            /**
             * Emit to "firstLoad" event.
             */
            server.emit("firstLoad");
            database.loadData.set("loadedAtLeastOnce", true);
        }

        yield dbReady = true;
    }());
}