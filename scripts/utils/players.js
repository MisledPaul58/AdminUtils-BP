import { world } from "@minecraft/server";
import { database } from "./database";

world.beforeEvents.playerLeave.subscribe(event => {
    const { player } = event;
    let data = database.getTable("PlayerData")[player.name] ?? {};

    data.lastDimension = player.dimension.id;
    data.lastLoc = player.location;
    data.lastGameMode = player.getGameMode();
    
    database.set("PlayerData", player.name, data);
});