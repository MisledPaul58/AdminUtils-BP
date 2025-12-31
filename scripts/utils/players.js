import { world, Player } from "@minecraft/server";
import { database } from "../database/index";
world.beforeEvents.playerLeave.subscribe(event => {
    const { player } = event;
    let data = database.playerData.get(player.name) ?? {};
    data.lastDimension = player.dimension.id;
    data.lastLoc = player.location;
    data.lastGameMode = player.getGameMode();
    database.playerData.set(player.name, data);
    let freeCam = database.freeCam.get(player.name);
    if (freeCam) {
        freeCam.autoChunkLoad.lastLoadLoc = {};
        database.freeCam.set(player.name, freeCam);
    }
});
Player.prototype.sendCustomMessage = function (msg, args) {
    const rawMessage = {
        translate: msg,
        with: args
    };
    this.sendMessage(['§l§cAU §6>>§r ', rawMessage]); //TODO change to §l§9AU §3>> or §l§3AU §9>>? And keep this one for the errors
};
Player.prototype.sendSuccess = function (msg, args) {
    this.sendCustomMessage(msg, args);
    this.playSound("au.success");
};
Player.prototype.sendError = function (msg, args) {
    this.sendCustomMessage(msg, args);
    this.playSound("au.error");
};
