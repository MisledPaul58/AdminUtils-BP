import { world, Player, RawMessage, system } from "@minecraft/server";
import { database } from "../database/index";
import { TranslationsType } from "./translations";

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

declare module "@minecraft/server" {
    interface Player {
        /**
         * Send a custom message (AU >> ...).
         */
        sendCustomMessage(msg: TranslationsType | string, args?: RawMessage | string[]): void;

        /**
         * Send a success message with a sound.
         */
        sendSuccess(msg: TranslationsType | string, args?: RawMessage | string[]): void;

        /**
         * Send an error message with a sound.
         */
        sendError(msg: TranslationsType | string, args?: RawMessage | string[]): void;
    }
}

Player.prototype.sendCustomMessage = function (msg: TranslationsType | string, args?: RawMessage | string[]): void {
    const rawMessage: RawMessage = {
        translate: msg,
        with: args
    };
    this.sendMessage(['§l§cAU §6>>§r ', rawMessage]); //TODO change to §l§9AU §3>> or §l§3AU §9>>? And keep this one for the errors
};

Player.prototype.sendSuccess = function (msg: TranslationsType | string, args?: RawMessage | string[]): void {
    this.sendCustomMessage(msg, args);
    this.playSound("au.success");
};

Player.prototype.sendError = function (msg: TranslationsType | string, args?: RawMessage | string[]): void {
    this.sendCustomMessage(msg, args);
    this.playSound("au.error");
};