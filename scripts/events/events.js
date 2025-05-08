import { server } from "../server";
import { system, world } from "@minecraft/server";
import { database } from "../database/index";
let worldReady = false;
let tickCount = 0;
let previousTime = Date.now();
system.runInterval(() => {
    tickCount++;
    if (!worldReady && (world.getAllPlayers().length || tickCount >= 200)) {
        worldReady = true;
        const msLoadTime = Date.now() - previousTime;
        /**
         * Emit to "ready" event.
         */
        server.emit("ready", { tickLoadTime: tickCount, msLoadTime });
        database.loadData
            .set("ready", true, false)
            .set("lastTickLoadTime", tickCount, false)
            .set("lastMsLoadTime", msLoadTime, true);
        const firstLoad = database.loadData.get("loadedAtLeastOnce");
        if (!firstLoad) {
            /**
             * Emit to "firstLoad" event.
             */
            server.emit("firstLoad");
            database.loadData.set("loadedAtLeastOnce", true);
        }
        else if (tickCount <= 5)
            server.sendCustomMessage("system.reload", [msLoadTime.toString()]);
    }
    if (worldReady) {
        /**
         * Emit to "tick" event.
         */
        server.emit("tick", { currentTick: tickCount });
    }
}, 1);
