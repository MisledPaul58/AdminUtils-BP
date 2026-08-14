import { world, Player } from "@minecraft/server";
import { DB } from "../database/index";
world.beforeEvents.playerLeave.subscribe(event => {
    const { player } = event;
    let data = DB.PlayerData.get(player.name) ?? {};
    data.lastDimension = player.dimension.id;
    data.lastLoc = player.location;
    data.lastGameMode = player.getGameMode();
    DB.PlayerData.set(player.name, data);
    let freeCam = DB.Freecam.get(player.name);
    if (freeCam) {
        freeCam.autoChunkLoad.lastLoadLoc = {};
        DB.Freecam.set(player.name, freeCam);
    }
});
Player.prototype.sendCustomMessage = function (msg, args) {
    const rawMessage = {
        translate: msg,
        with: args
    };
    this.sendMessage(['§l§cAU §6>>§r ', rawMessage]);
};
Player.prototype.sendSuccess = function (msg, args) {
    this.sendCustomMessage(msg, args);
    this.playSound("au.success");
};
Player.prototype.sendError = function (msg, args) {
    this.sendCustomMessage(msg, args);
    this.playSound("au.error");
};
