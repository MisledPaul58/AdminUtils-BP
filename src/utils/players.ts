import { world, Player, RawMessage, system } from "@minecraft/server";
import { DB } from "../database/index";
import { TranslationsType } from "./translations";

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

declare module "@minecraft/server" {
    interface Player {
        /**
         * Send a custom message (AU >> ...).
         */
        sendCustomMessage(msg: TranslationsType | string, args?: string[]): void;

        /**
         * Send a success message with a sound.
         */
        sendSuccess(msg: TranslationsType | string, args?: string[]): void;

        /**
         * Send an error message with a sound.
         */
        sendError(msg: TranslationsType | string, args?: string[]): void;
    }
}

Player.prototype.sendCustomMessage = function (msg: TranslationsType | string, args?: string[]): void {
    const rawMessage: RawMessage = {
        translate: msg,
        with: args
    };
    this.sendMessage(['§l§cAU §6>>§r ', rawMessage]);
};

Player.prototype.sendSuccess = function (msg: TranslationsType | string, args?: string[]): void {
    this.sendCustomMessage(msg, args);
    this.playSound("au.success");
};

Player.prototype.sendError = function (msg: TranslationsType | string, args?: string[]): void {
    this.sendCustomMessage(msg, args);
    this.playSound("au.error");
};