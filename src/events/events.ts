import { server } from "../server";
import { system, world } from "@minecraft/server";
import { DB } from "../database/databaseManager";
import { Translations } from "../utils/translations";

let worldReady = false;
let tickCount = 0;
let previousTime = Date.now();
system.runInterval(() => {
    tickCount++;
    if (!worldReady && server.isInitialized && (tickCount >= 200 || world.getAllPlayers().length)) {
        worldReady = true;

        const msLoadTime = Date.now() - previousTime;
        /**
         * Emit to "ready" event.
         */
        server.emit("ready", { tickLoadTime: tickCount, msLoadTime });
        DB.LoadData
            .set("ready", true, false)
            .set("lastTickLoadTime", tickCount, false)
            .set("lastMsLoadTime", msLoadTime, true);

        const firstLoad = DB.LoadData.get("loadedAtLeastOnce");
        if (!firstLoad) {
            /**
             * Emit to "firstLoad" event.
             */
            server.emit("firstLoad");
            DB.LoadData.set("loadedAtLeastOnce", true);

        } else if (tickCount <= 5) server.sendCustomMessage(Translations.Msg.SystemReload, [msLoadTime.toString()]);
    }

    if (worldReady) {
        /**
         * Emit to "tick" event.
         */
        server.emit("tick", { currentTick: tickCount });
    }
}, 1);