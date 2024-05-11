import { world } from "@minecraft/server";
import { databases } from "../main";

world.beforeEvents.playerLeave.subscribe(event => {
    const { player } = event;
    let data = databases.playerData.get(player.name) ?? {};

    data.lastDimension = player.dimension.id;
    data.lastLoc = player.location;
    data.lastGameMode = player.getGameMode();
    
    databases.playerData.set(player.name, data);

    let freeCam = databases.freeCam.get(player.name);
    if (freeCam) {
        freeCam.autoChunkLoad.lastLoadLoc = {};
        databases.freeCam.set(player.name, freeCam);
    }
});