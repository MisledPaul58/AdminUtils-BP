import { Dimension, EasingType, EffectTypes, Player, TicksPerSecond, system, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { databases, adminUtils, areObjectsEqual, delay, isValidUsername, toDimId, toFancyDim } from "../main";
import { utils } from "../utils/utils";
import moment from "../moment/moment";

class FreeCam {
    /**
     * @param { Player } p
     */
    init(p) {
        let extraButton = 0;
        const form = new ActionFormData()
            .title("Freecam menu")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png");
        if (this.isInFreeCam(p.name)) {
            form.button("§lCurrent freecam\n§r§8[ §b§oClick to manage§r§8 ]", "textures/icons/settings1.png");
            extraButton++;
        }
        form.button("Spectator Freecam", "textures/icons/vanish.png")
            .button("Freecam [Experimental]", "textures/icons/camera.png") //warn users that if they are in Creative mode they mustn't fly
            .show(p).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;
            // if (buttons === 4) {

            // } else {

            // }

            // if (selection === 0) {
            //     adminUtils(player);
            // } else if (selection === 1 && buttons === 4) {


            // } else if (selection === 1 && buttons === 3) {

            // } else if () {

            // }
            switch (selection) {
                case 0: //Back
                    adminUtils(p);
                    break;
                case extraButton:
                    this.#manageFreeCamGUI(p);
                    break;
                case 1 + extraButton: //Spectator Freecam
                    this.#specFreeCamGUI(p);
                    break;
                case 2 + extraButton: //Freecam [Experimental]
                    this.#expFreeCamGUI(p);
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * @param { Player } p
     */
    #specFreeCamGUI(p) {
        new ActionFormData()
            .title("§lSpectator Freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Enable Spectator Freecam for a player", "textures/icons/tick.png")
            .button("Disable Spectator Freecam for a player", "textures/icons/cross.png")
            .show(p).then((response) => {
            if (response.canceled === true) return;

            switch (response.selection) {
                case 0:
                    this.init(p);
                    break;
                case 1:
                    this.#enableSpecFreeCamGUI(p);
                    break;
                case 2:
                    this.#disableSpecFreeCamGUI(p);
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * @param { Player } p
     */
    #expFreeCamGUI(p) {
        new ActionFormData()
            .title("§lExperimental Freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Enable Experimental Freecam for a player", "textures/icons/tick.png")
            .button("Disable Experimental Freecam for a player", "textures/icons/cross.png")
            .button("How to use", "textures/icons/howToUse.png")
            .show(p).then((response) => {
            if (response.canceled === true) return;

            switch (response.selection) {
                case 0:
                    this.init(p);
                    break;
                case 1:
                    this.#enableExpFreeCamGUI(p);
                    break;
                case 2:
                    this.#disableExpFreeCamGUI(p);
                    break;
                case 3:
                    this.#expFreecamHowTo(p);
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * @param { Player } p
     */
    #expFreecamHowTo(p) {
        p.sendMessage("§l§o§6§k====§r§l§o§6============================§k====§r\n" +
            "§aWith this freecam you can §bclip through blocks§a at the speed you want. You can do §b3 different things§a depending on the hotbar slot you have selected:\n" +
            "  §7* §mSlot 7: §3force chunk load.\n" +
            "  §7* §mSlot 8: §3increase freecam speed.\n" +
            "  §7* §mSlot 9: §3decrease freecam speed.\n" +
            "\n" +
            "§aYou can find plenty of §boptions and settings§a in the Freecam menu, such as exiting the freecam or customizing the §aAuto chunk load system.\n" +
            "§l§6§k====§r§l§o§6============================§k====§r");
        p.playSound("random.levelup", { volume: 0.6 });
    }

    /**
     * @param { Player } p
     */
    #enableSpecFreeCamGUI(p) {
        let availablePlayers = [];
        const form = new ActionFormData()
            .title("Enable Spectator Freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Type an offline/online player instead", "textures/icons/pencil.png")
            .button("Enable for myself", "textures/icons/tick.png");

        for (const player of world.getPlayers().map(player => player.name)) {
            if (!this.isInFreeCam(player) && player !== p.name) {
                form.button(player, "textures/icons/steve_icon.png");
                availablePlayers.push(player);
            }
        }

        form.show(p).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;

            if (selection === 0) { //Back
                this.#specFreeCamGUI(p);

            } else if (selection === 1) { //Type manually
                new ModalFormData()
                    .title("Enable Spectator Freecam")
                    .textField("Type below the player you would like to enable Spectator Freecam for.", "Player's name")
                    .show(p).then(result => {
                    if (result.canceled === true) return this.#enableSpecFreeCamGUI(p);

                    const specifiedPlayer = result.formValues[0];
                    if (!isValidUsername(specifiedPlayer)) {
                        p.sendMessage("§cError, the username you entered is invalid.");
                        p.playSound("au.error");

                    } else if (this.isInSpecFreeCam(specifiedPlayer)) {
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is already in Spectator Freecam.`);
                        p.playSound("au.error");

                    } else if (this.isInExpFreeCam(specifiedPlayer)) {
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is in Experimental Freecam. Please disable it first.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const rawPlayer = world.getPlayers({ name: specifiedPlayer })[0];
                            let data = {};
                            if (rawPlayer) {
                                data = {
                                    mode: "spectatorFreeCam",
                                    lastDimension: rawPlayer.dimension.id,
                                    startLoc: rawPlayer.location,
                                    lastGameMode: rawPlayer.getGameMode(),
                                    hasToLeaveFreeCam: false
                                };
                            } else {
                                data = {
                                    mode: "spectatorFreeCam",
                                    lastDimension: databases.playerData.get(specifiedPlayer)?.lastDimension, //These keys with undefined values are actually lost during JSON.stringify
                                    startLoc: databases.playerData.get(specifiedPlayer)?.lastLoc,
                                    lastGameMode: databases.playerData.get(specifiedPlayer)?.lastGameMode,
                                    hasToLeaveFreeCam: false
                                };
                            }
                            databases.freeCam.set(specifiedPlayer, data);
                            p.sendMessage(`§bSpectator Freecam§a has been enabled successfully for §b${specifiedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't enable §4Spectator Freecam§c for §4${specifiedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });

            } else if (selection === 2) { //Enable for myself
                if (this.isInExpFreeCam(p.name)) {
                    new MessageFormData()
                        .title("Enable Spectator Freecam")
                        .body("§bYou are currently in Experimental Freecam.§r\nIf you want to change to Spectator Freecam, please go to §bCurrent freecam§r and disable Experimental Freecam first.\nWould you like to go now?")
                        .button1("No")
                        .button2("Yes")
                        .show(p).then(result => {
                        if (result.canceled === true || result.selection === 0) return this.#enableSpecFreeCamGUI(p);

                        if (!this.isInExpFreeCam(p.name)) {
                            p.sendMessage("§Error, another user has recently disabled Experimental Freecam for you.")
                            p.playSound("au.error");

                        } else {
                            this.#manageFreeCamGUI(p);
                        }
                    });

                } else {
                    new MessageFormData()
                        .title("Enable Spectator Freecam")
                        .body("Are you sure you want to enable Spectator Freecam for §byourself§r?")
                        .button1("No")
                        .button2("Yes")
                        .show(p).then(result => {
                        if (result.canceled === true || result.selection === 0) return this.#enableSpecFreeCamGUI(p);

                        if (this.isInSpecFreeCam(p.name)) { //In case another player enabled it for them
                            p.sendMessage("§cError, you are already in Spectator Freecam.");
                            p.playSound("au.error");

                        } else if (this.isInExpFreeCam(p.name)) {
                            p.sendMessage("§cError, another user has recently enabled Experimental Freecam for you.");
                            p.playSound("au.error");

                        } else {
                            try {
                                const data = {
                                    mode: "spectatorFreeCam",
                                    lastDimension: p.dimension.id,
                                    startLoc: p.location,
                                    lastGameMode: p.getGameMode(),
                                    hasToLeaveFreeCam: false
                                };
                                databases.freeCam.set(p.name, data);
                                p.sendMessage(`§bSpectator Freecam§a has been enabled successfully for you.`);
                                p.sendMessage("§l§cAU §6>>§r §sIn order to open the admin panel while you're in Spectator Freecam, please use the command: §b§l§o-au§r");
                                p.playSound("au.success");
                            } catch (e) {
                                console.warn(e);
                                p.sendMessage("§cError, couldn't enable §4Spectator Freecam§c.");
                                p.playSound("au.error");
                            }
                        }
                    });
                }

            } else if (selection >= 3) { //Player selection
                const selectedPlayer = availablePlayers[selection - 3];

                new MessageFormData()
                    .title("Enable Spectator Freecam")
                    .body(`Are you sure you want to enable Spectator Freecam for §b${selectedPlayer}§r?`)
                    .button1("No")
                    .button2("Yes")
                    .show(p).then(result => {
                    if (result.canceled === true || result.selection === 0) return this.#enableSpecFreeCamGUI(p);

                    if (this.isInSpecFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently entered Spectator Freecam.`);
                        p.playSound("au.error");

                    } else if (this.isInExpFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently entered Experimental Freecam.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const rawPlayer = world.getPlayers({ name: selectedPlayer })[0];
                            let data = {};
                            if (rawPlayer) {
                                data = {
                                    mode: "spectatorFreeCam",
                                    lastDimension: rawPlayer.dimension.id,
                                    startLoc: rawPlayer.location,
                                    lastGameMode: rawPlayer.getGameMode(),
                                    hasToLeaveFreeCam: false
                                };
                            } else {
                                data = {
                                    mode: "spectatorFreeCam",
                                    lastDimension: databases.playerData.get(selectedPlayer)?.lastDimension,
                                    startLoc: databases.playerData.get(selectedPlayer)?.lastLoc,
                                    lastGameMode: databases.playerData.get(selectedPlayer)?.lastGameMode,
                                    hasToLeaveFreeCam: false
                                };
                            }
                            databases.freeCam.set(selectedPlayer, data);
                            p.sendMessage(`§bSpectator Freecam§a has been enabled successfully for §b${selectedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't enable §4Spectator Freecam§c for §4${selectedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });
            }
        });
    }


    /**
     * @param { Player } p
     */
    #disableSpecFreeCamGUI(p) {
        let availablePlayers = [];
        const form = new ActionFormData()
            .title("Disable Spectator Freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Type an offline/online player instead", "textures/icons/pencil.png")
            .button("Disable for myself", "textures/icons/cross.png");

        for (const player of databases.freeCam.keys()) {
            if (this.isInSpecFreeCam(player) && player !== p.name) {
                form.button(player, "textures/icons/steve_icon.png");
                availablePlayers.push(player);
            }
        }

        form.show(p).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;

            if (selection === 0) { //Back
                this.#specFreeCamGUI(p);

            } else if (selection === 1) { //Type manually
                new ModalFormData()
                    .title("Disable Spectator Freecam")
                    .textField("§bType below the player you would like to disable Spectator Freecam for.\n§rTheir character will stay where their freecam is located right now.", "Player's name")
                    .show(p).then(result => {
                    if (result.canceled === true) return this.#disableSpecFreeCamGUI(p);

                    const specifiedPlayer = result.formValues[0];
                    if (!isValidUsername(specifiedPlayer)) {
                        p.sendMessage("§cError, the username you entered is invalid.");
                        p.playSound("au.error");

                    } else if (this.isInExpFreeCam(specifiedPlayer)) { //Make a messageformdata to go to disable Experimental Freecam menu?
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is in Experimental Freecam, not Spectator Freecam. Please disable it in the Experimental Freecam menu.`);
                        p.playSound("au.error");

                    } else if (!this.isInSpecFreeCam(specifiedPlayer)) {
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is not in Spectator Freecam.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const rawPlayer = world.getPlayers({ name: specifiedPlayer })[0];
                            if (rawPlayer) {
                                rawPlayer.setGameMode(databases.freeCam.get(specifiedPlayer).lastGameMode);
                                databases.freeCam.delete(specifiedPlayer);
                            } else {
                                let data = databases.freeCam.get(specifiedPlayer);
                                data.hasToLeaveFreeCam = true;
                                databases.freeCam.set(specifiedPlayer, data);
                            }
                            p.sendMessage(`§bSpectator Freecam§a has been disabled successfully for §b${specifiedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't disable §4Spectator Freecam§c for §4${specifiedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });

            } else if (selection === 2) { //Disable for myself
                if (!this.isInFreeCam(p.name)) {
                    p.sendMessage("§cYou are not in a freecam mode.");
                    p.playSound("au.error");
                    this.#disableSpecFreeCamGUI(p);

                } else {
                    new MessageFormData()
                        .title("Disable Spectator Freecam")
                        .body("Please go to §bCurrent freecam§r to choose how you would like to disable the freecam.\nWould you like to go now?")
                        .button1("No")
                        .button2("Yes")
                        .show(p).then(result => {
                        if (result.canceled === true || result.selection === 0) return this.#disableSpecFreeCamGUI(p);

                        if (!this.isInFreeCam(p.name)) {
                            p.sendMessage("§cError, another user has disabled your freecam.");

                        } else {
                            this.#manageFreeCamGUI(p);
                        }
                    });
                }

            } else if (selection >= 3) { //Player selection
                const selectedPlayer = availablePlayers[selection - 3];

                new MessageFormData()
                    .title("Disable Spectator Freecam")
                    .body(`Are you sure you want to disable Spectator Freecam for §b${selectedPlayer}§r?`)
                    .button1("No")
                    .button2("Yes")
                    .show(p).then(result => {
                    if (result.canceled === true || result.selection === 0) return this.#disableSpecFreeCamGUI(p);

                    if (this.isInExpFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently left Spectator Freecam and is now in Experimental Freecam.`);
                        p.playSound("au.error");

                    } else if (!this.isInSpecFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently left Spectator Freecam.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const rawPlayer = world.getPlayers({ name: selectedPlayer })[0];
                            if (rawPlayer) {
                                rawPlayer.setGameMode(databases.freeCam.get(selectedPlayer).lastGameMode);
                                databases.freeCam.delete(selectedPlayer);
                            } else {
                                let data = databases.freeCam.get(selectedPlayer);
                                data.hasToLeaveFreeCam = true;
                                databases.freeCam.set(selectedPlayer, data);
                            }
                            p.sendMessage(`§bSpectator Freecam§a has been disabled successfully for §b${selectedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't disable §4Spectator Freecam§c for §4${selectedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });
            }
        });
    }

    /**
     *
     * @param { Player } p
     */
    #enableExpFreeCamGUI(p) {
        let availablePlayers = [];
        const form = new ActionFormData()
            .title("Enable Experimental Freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Type an offline/online player instead", "textures/icons/pencil.png")
            .button("Enable for myself", "textures/icons/tick.png");

        for (const player of world.getPlayers().map(player => player.name)) {
            if (!this.isInFreeCam(player) && player !== p.name) {
                form.button(player, "textures/icons/steve_icon.png");
                availablePlayers.push(player);
            }
        }

        form.show(p).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;

            if (selection === 0) { //Back
                this.#expFreeCamGUI(p);

            } else if (selection === 1) { //Type manually
                new ModalFormData()
                    .title("Enable Experimental Freecam")
                    .textField("Type below the player you would like to enable Experimental Freecam for.", "Player's name")
                    .show(p).then(result => {
                    if (result.canceled === true) return this.#enableSpecFreeCamGUI(p);

                    const specifiedPlayer = result.formValues[0];
                    if (!isValidUsername(specifiedPlayer)) {
                        p.sendMessage("§cError, the username you entered is invalid.");
                        p.playSound("au.error");

                    } else if (this.isInExpFreeCam(specifiedPlayer)) {
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is already in Experimental Freecam.`);
                        p.playSound("au.error");

                    } else if (this.isInSpecFreeCam(specifiedPlayer)) {
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is in Spectator Freecam. Please disable it first.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const rawPlayer = world.getPlayers({ name: specifiedPlayer })[0];
                            let data = {};
                            if (rawPlayer) {
                                data = {
                                    mode: "experimentalFreeCam",
                                    startLoc: rawPlayer.location,
                                    lastCamLoc: {},
                                    lastGameMode: rawPlayer.getGameMode(),
                                    speed: 1.5,
                                    autoChunkLoad: {
                                        enabled: true,
                                        loading: false,
                                        radius: 8,
                                        loadTime: 7,
                                        lastLoadLoc: {},
                                        forceLoad: false
                                    },
                                    hasToLeaveFreeCam: false
                                };
                            } else {
                                data = {
                                    mode: "experimentalFreeCam",
                                    startLoc: databases.playerData.get(specifiedPlayer)?.lastLoc, //These keys with undefined values are actually lost during JSON.stringify
                                    lastCamLoc: {},
                                    lastGameMode: databases.playerData.get(specifiedPlayer)?.lastGameMode,
                                    speed: 1.5,
                                    autoChunkLoad: {
                                        enabled: true,
                                        loading: false,
                                        radius: 8,
                                        loadTime: 7,
                                        lastLoadLoc: {},
                                        forceLoad: false
                                    },
                                    hasToLeaveFreeCam: false
                                };
                            }
                            databases.freeCam.set(specifiedPlayer, data);
                            p.sendMessage(`§bExperimental Freecam§a has been enabled successfully for §b${specifiedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't enable §4Experimental Freecam§c for §4${specifiedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });

            } else if (selection === 2) { //Enable for myself
                if (this.isInSpecFreeCam(p.name)) {
                    new MessageFormData()
                        .title("Enable Experimental Freecam")
                        .body("§bYou are currently in Spectator Freecam.§r\nIf you want to change to Experimental Freecam, please go to §bCurrent freecam§r and disable Spectator Freecam first.\nWould you like to go now?")
                        .button1("No")
                        .button2("Yes")
                        .show(p).then(result => {
                        if (result.canceled === true || result.selection === 0) return this.#enableExpFreeCamGUI(p);

                        if (!this.isInSpecFreeCam(p.name)) {
                            p.sendMessage("§Error, another user has recently disabled Spectator Freecam for you.")
                            p.playSound("au.error");

                        } else {
                            this.#manageFreeCamGUI(p);
                        }
                    });

                } else {
                    new MessageFormData()
                        .title("Enable Experimental Freecam")
                        .body("Are you sure you want to enable Experimental Freecam for §byourself§r?")
                        .button1("No")
                        .button2("Yes")
                        .show(p).then(result => {
                        if (result.canceled === true || result.selection === 0) return this.#enableExpFreeCamGUI(p);

                        if (this.isInExpFreeCam(p.name)) { //In case another player enabled it for them
                            p.sendMessage("§cError, you are already in §4Experimental Freecam.");
                            p.playSound("au.error");
                            this.#enableExpFreeCamGUI(p);

                        } else if (this.isInSpecFreeCam(p.name)) {
                            p.sendMessage("§cError, another user has recently enabled Spectator Freecam for you.");
                            p.playSound("au.error");
                            this.#enableExpFreeCamGUI(p);

                        } else {
                            try {
                                const data = {
                                    mode: "experimentalFreeCam",
                                    startLoc: p.location,
                                    lastCamLoc: {},
                                    lastGameMode: p.getGameMode(),
                                    speed: 1.5,
                                    autoChunkLoad: {
                                        enabled: true,
                                        loading: false,
                                        radius: 8,
                                        loadTime: 7,
                                        lastLoadLoc: {},
                                        forceLoad: false
                                    },
                                    hasToLeaveFreeCam: false
                                };
                                databases.freeCam.set(p.name, data);
                                p.sendMessage(`§bExperimental Freecam§a has been enabled successfully for you.`);
                                p.playSound("au.success");
                            } catch (e) {
                                console.warn(e);
                                p.sendMessage("§cError, couldn't enable §4Experimental Freecam§c.");
                                p.playSound("au.error");
                            }
                        }
                    });
                }

            } else if (selection >= 3) { //Player selection
                const selectedPlayer = availablePlayers[selection - 3];

                new MessageFormData()
                    .title("Enable Experimental Freecam")
                    .body(`Are you sure you want to enable Experimental Freecam for §b${selectedPlayer}§r?`)
                    .button1("No")
                    .button2("Yes")
                    .show(p).then(result => {
                    if (result.canceled === true || result.selection === 0) return this.#enableExpFreeCamGUI(p);

                    if (this.isInExpFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently entered Experimental Freecam.`);
                        p.playSound("au.error");

                    } else if (this.isInSpecFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently entered Spectator Freecam.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const rawPlayer = world.getPlayers({ name: selectedPlayer })[0];
                            let data = {};
                            if (rawPlayer) {
                                data = {
                                    mode: "experimentalFreeCam",
                                    startLoc: rawPlayer.location,
                                    lastCamLoc: {},
                                    lastGameMode: rawPlayer.getGameMode(),
                                    speed: 1.5,
                                    autoChunkLoad: {
                                        enabled: true,
                                        loading: false,
                                        radius: 8,
                                        loadTime: 7,
                                        lastLoadLoc: {},
                                        forceLoad: false
                                    },
                                    hasToLeaveFreeCam: false
                                };
                            } else {
                                data = {
                                    mode: "experimentalFreeCam",
                                    startLoc: databases.playerData.get(selectedPlayer)?.lastLoc,
                                    lastCamLoc: {},
                                    lastGameMode: databases.playerData.get(selectedPlayer)?.lastGameMode,
                                    speed: 1.5,
                                    autoChunkLoad: {
                                        enabled: true,
                                        loading: false,
                                        radius: 8,
                                        loadTime: 7,
                                        lastLoadLoc: {},
                                        forceLoad: false
                                    },
                                    hasToLeaveFreeCam: false
                                };
                            }
                            databases.freeCam.set(selectedPlayer, data);
                            p.sendMessage(`§bExperimental Freecam§a has been enabled successfully for §b${selectedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't enable §4Experimental Freecam§c for §4${selectedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });
            }
        });
    }

    /**
     *
     * @param { Player } p
     */
    #disableExpFreeCamGUI(p) {
        let availablePlayers = [];
        const form = new ActionFormData()
            .title("Disable Experimental Freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Type an offline/online player instead", "textures/icons/pencil.png")
            .button("Disable for myself", "textures/icons/cross.png");

        for (const player of databases.freeCam.keys()) {
            if (this.isInExpFreeCam(player) && player !== p.name) {
                form.button(player, "textures/icons/steve_icon.png");
                availablePlayers.push(player);
            }
        }

        form.show(p).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;

            if (selection === 0) { //Back
                this.#expFreeCamGUI(p);

            } else if (selection === 1) { //Type manually
                new ModalFormData()
                    .title("Disable Experimental Freecam")
                    .textField("§bType below the player you would like to disable Experimental Freecam for.", "Player's name")
                    .show(p).then(result => {
                    if (result.canceled === true) return this.#disableExpFreeCamGUI(p);

                    const specifiedPlayer = result.formValues[0];
                    if (!isValidUsername(specifiedPlayer)) {
                        p.sendMessage("§cError, the username you entered is invalid.");
                        p.playSound("au.error");

                    } else if (this.isInSpecFreeCam(specifiedPlayer)) { //Make a messageformdata to go to disable Spectator Freecam menu?
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is in Spectator Freecam, not Experimental Freecam. Please disable it in the Spectator Freecam menu.`);
                        p.playSound("au.error");

                    } else if (!this.isInExpFreeCam(specifiedPlayer)) {
                        p.sendMessage(`§cError, §4${specifiedPlayer}§c is not in Experimental Freecam.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            let data = databases.freeCam.get(specifiedPlayer);
                            data.hasToLeaveFreeCam = true;
                            databases.freeCam.set(specifiedPlayer, data);

                            p.sendMessage(`§bExperimental Freecam§a has been disabled successfully for §b${specifiedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't disable §4Experimental Freecam§c for §4${specifiedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });

            } else if (selection === 2) { //Disable for myself
                if (!this.isInFreeCam(p.name)) {
                    p.sendMessage("§cYou are not in a freecam mode.");
                    p.playSound("au.error");
                    this.#disableExpFreeCamGUI(p);

                } else {
                    new MessageFormData()
                        .title("Disable Experimental Freecam")
                        .body("Please go to §bCurrent freecam§r to choose how you would like to disable the freecam.\nWould you like to go now?")
                        .button1("No")
                        .button2("Yes")
                        .show(p).then(result => {
                        if (result.canceled === true || result.selection === 0) return this.#disableExpFreeCamGUI(p);

                        if (!this.isInFreeCam(p.name)) {
                            p.sendMessage("§cError, another user has disabled your freecam.");

                        } else {
                            this.#manageFreeCamGUI(p);
                        }
                    });
                }

            } else if (selection >= 3) { //Player selection
                const selectedPlayer = availablePlayers[selection - 3];

                new MessageFormData()
                    .title("Disable Experimental Freecam")
                    .body(`Are you sure you want to disable Experimental Freecam for §b${selectedPlayer}§r?`)
                    .button1("No")
                    .button2("Yes")
                    .show(p).then(result => {
                    if (result.canceled === true || result.selection === 0) return this.#disableExpFreeCamGUI(p);

                    if (this.isInSpecFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently left Experimental Freecam and is now in Spectator Freecam.`);
                        p.playSound("au.error");

                    } else if (!this.isInExpFreeCam(selectedPlayer)) {
                        p.sendMessage(`§cError, §4${selectedPlayer}§c has recently left Experimental Freecam.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            let data = databases.freeCam.get(selectedPlayer);
                            data.hasToLeaveFreeCam = true;
                            databases.freeCam.set(selectedPlayer, data);

                            p.sendMessage(`§bExperimental Freecam§a has been disabled successfully for §b${selectedPlayer}§a.`);
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't disable §4Experimental Freecam§c for §4${selectedPlayer}§c.`);
                            p.playSound("au.error");
                        }
                    }
                });
            }
        });
    }

    /**
     * @param { Player } p
     */
    #manageFreeCamGUI(p) {
        if (!this.isInFreeCam(p.name)) {
            p.sendMessage("§cError, another user has recently disabled your freecam.");
            p.playSound("au.error");

        } else {
            if (this.isInSpecFreeCam(p.name)) {
                new ActionFormData()
                    .title("§lManage §bSpectator Freecam")
                    .body("Select an option")
                    .button("§l<-- Back", "textures/icons/back.png") //0
                    .button("Teleport freecam to the starting location") //1
                    .button("Teleport freecam to a specific location") //2
                    .button("Teleport freecam to a player") //3
                    .button("Exit freecam and teleport to the starting location") //4
                    .button("Exit freecam at current location")//5
                    .show(p).then((response) => {
                    if (response.canceled === true) return;

                    if (!this.isInSpecFreeCam(p.name)) {
                        p.sendMessage("§cError, another user has recently disabled your freecam.");
                        p.playSound("au.error");

                    } else {
                        const { selection } = response;

                        switch (selection) {
                            case 0:
                                this.init(p);
                                break;

                            case 1: { //Tp to starting location
                                const { startLoc } = databases.freeCam.get(p.name);
                                new MessageFormData()
                                    .title("§lTeleport to the starting loc.")
                                    .body(`Are you sure you want to teleport your freecam to the starting location?\n§l§bStarting location:\n§rX: ${startLoc.x.toFixed(2)}, Y: ${startLoc.y.toFixed(2)}, Z: ${startLoc.z.toFixed(2)}, ${toFancyDim(databases.freeCam.get(p.name).lastDimension)}`)
                                    .button1("No")
                                    .button2("Yes")
                                    .show(p).then(async result => {
                                    if (result.canceled === true || result.selection === 0) return this.#manageFreeCamGUI(p);

                                    if (!this.isInSpecFreeCam(p.name)) {
                                        p.sendMessage("§cError, another user has recently disabled your freecam.");
                                        p.playSound("au.error");

                                    } else {
                                        try {
                                            const data = databases.freeCam.get(p.name);
                                            p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                                            await delay(40);
                                            p.teleport(data.startLoc, { dimension: world.getDimension(data.lastDimension) });
                                            await delay(20);
                                            p.sendMessage("§bTeleported!");
                                            p.playSound("au.success");
                                        } catch (e) {
                                            console.warn(e);
                                            p.sendMessage("§cError, couldn't teleport you to the §4starting location§c.");
                                            p.playSound("au.error");
                                        }
                                    }
                                });
                            }
                                break;

                            case 2: { //Tp to specific location
                                const dimensions = ["§bOverworld", "§cNether", "§5The End"];
                                new ModalFormData()
                                    .title(`§lTeleport to a specific location.\n§bYour current coordinates are:§r X: ${p.location.x.toFixed(2)}, Y: ${p.location.y.toFixed(2)}, Z: ${p.location.z.toFixed(2)}`)
                                    .dropdown("Choose a dimension", dimensions, 0)
                                    .textField("Write the coordinates. For example: -165 68 250 or -164.50 68.00 250.50", "e.g. -165 68 250")
                                    .show(p).then(async result => {
                                    if (result.canceled === true) return this.#manageFreeCamGUI(p);

                                    if (!this.isInSpecFreeCam(p.name)) {
                                        p.sendMessage("§cError, another user has recently disabled your freecam.");
                                        p.playSound("au.error");

                                    } else {
                                        const dimension = toDimId(dimensions[result.formValues[0]]);
                                        const rawCoords = result.formValues[1];
                                        const regexp = /^-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? -?\d+(?:\.\d+)?$/;

                                        if (rawCoords.trim() === "") {
                                            p.sendMessage("§cError, please enter the coordinates you want to teleport to.");
                                            p.playSound("au.error");

                                        } else if (!regexp.test(rawCoords.trim())) {
                                            p.sendMessage(`§cError, §4${rawCoords}§c are not valid coordinates. Make sure you haven't written characters like commas or any extra space.`);
                                            p.playSound("au.error");

                                        } else {
                                            try {
                                                const coords = rawCoords.split(" ").map(coord => parseFloat(coord));
                                                p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                                                await delay(40);
                                                p.teleport({
                                                    x: coords[0],
                                                    y: coords[1],
                                                    z: coords[2]
                                                }, { dimension: world.getDimension(dimension) });
                                                await delay(20);
                                                p.sendMessage("§bTeleported!");
                                                p.playSound("au.success");
                                            } catch (e) {
                                                console.warn(e);
                                                p.sendMessage(`§cError, couldn't teleport you to §4${rawCoords}, ${dimensions[result.formValues[0]].substring(2)}§c.`);
                                                p.playSound("au.error");
                                            }
                                        }
                                    }
                                });
                            } break;

                            case 3: { //Teleport freecam to a player
                                const rawPlayers = world.getPlayers().filter(player => player.name !== p.name);
                                console.warn(rawPlayers.toString());
                                if (rawPlayers.length === 0) {
                                    p.sendMessage("§l§cAU §6>>§r §4No players were found!");
                                    p.playSound("au.error");
                                    return this.#manageFreeCamGUI(p);
                                }
                                const players = rawPlayers.map(player => player.name);
                                new ModalFormData()
                                    .title("§lTeleport freecam to a player")
                                    .dropdown("Choose a player", players)
                                    .show(p).then(async result => {
                                        if (result.canceled === true) return this.#manageFreeCamGUI(p);

                                        const selectedRawPlayer = rawPlayers[result.formValues[0]];
                                        const player = selectedRawPlayer.name;

                                        if (!this.isInSpecFreeCam(p.name)) {
                                            p.sendMessage("§cError, another user has recently disabled your freecam.");
                                            p.playSound("au.error");

                                        } else if (!selectedRawPlayer.isValid()) {
                                            p.sendMessage(`§cError, §4${player}§c has recently left.`);
                                            p.playSound("au.error");

                                        } else {
                                            try {
                                                p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                                                await delay(40);

                                                p.teleport(selectedRawPlayer.location);
                                                await delay(20);

                                                p.sendMessage("§bTeleported!");
                                                p.playSound("au.success");
                                            } catch (e) {
                                                console.warn(e);
                                                p.sendMessage(`§cError, couldn't teleport you to §4${player}§c.`);
                                                p.playSound("au.error");
                                            }
                                        }
                                    });
                            } break;

                            case 4: { //Exit and tp to starting location
                                const { startLoc } = databases.freeCam.get(p.name);
                                new MessageFormData()
                                    .title("§lExit and tp to the starting loc.")
                                    .body(`Are you sure you want to exit and teleport your freecam to the starting location?\n§l§bStarting location:\n§rX: ${startLoc.x.toFixed(2)}, Y: ${startLoc.y.toFixed(2)}, Z: ${startLoc.z.toFixed(2)}, ${toFancyDim(databases.freeCam.get(p.name).lastDimension)}`)
                                    .button1("No")
                                    .button2("Yes")
                                    .show(p).then(async result => {
                                    if (result.canceled === true || result.selection === 0) return this.#manageFreeCamGUI(p);

                                    if (!this.isInSpecFreeCam(p.name)) {
                                        p.sendMessage("§cError, another user has recently disabled your freecam.");
                                        p.playSound("au.error");

                                    } else {
                                        try {
                                            const data = databases.freeCam.get(p.name);
                                            p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                                            await delay(40);
                                            p.teleport(data.startLoc, { dimension: world.getDimension(data.lastDimension) });
                                            p.setGameMode(data.lastGameMode);
                                            databases.freeCam.delete(p.name);
                                            await delay(20);
                                            p.sendMessage("§bTeleported!");
                                            p.playSound("au.success");
                                        } catch (e) {
                                            console.warn(e);
                                            p.sendMessage("§cError, couldn't exit freecam and teleport you to the starting location.");
                                            p.playSound("au.error");
                                        }
                                    }
                                });
                            }
                                break;

                            case 5: { //Exit at current location
                                new MessageFormData()
                                    .title("§lExit at current location")
                                    .body("Are you sure you want to §bexit§r the freecam mode at your §bcurrent location§r?")
                                    .button1("No")
                                    .button2("Yes")
                                    .show(p).then(result => {
                                    if (result.canceled === true || result.selection === 0) return this.#manageFreeCamGUI(p);

                                    if (!this.isInSpecFreeCam(p.name)) {
                                        p.sendMessage("§cError, another user has recently disabled your freecam.");
                                        p.playSound("au.error");

                                    } else {
                                        try {
                                            p.setGameMode(databases.freeCam.get(p.name).lastGameMode);
                                            databases.freeCam.delete(p.name);
                                            p.sendMessage("§bSpectator Freecam§a has been disabled successfully at your current location.");
                                            p.playSound("au.success");
                                        } catch (e) {
                                            console.warn(e);
                                            p.sendMessage(`§cError, couldn't exit §4Spectator Freecam§c.`);
                                            p.playSound("au.error");
                                        }
                                    }
                                });
                            }
                                break;

                            default:
                                break;
                        }
                    }
                });
            } else {
                new ActionFormData()
                    .title("§lManage §bExperimental Freecam")
                    .body("Select an option")
                    .button("§l<-- Back", "textures/icons/back.png") //0
                    .button(`§lAuto chunk load:§r ${databases.freeCam.get(p.name).autoChunkLoad.enabled ? "§aON" : "§cOFF"}§r\n§8[ §b§oClick to manage §8]`) //1
                    .button("Teleport freecam to the starting location") //2
                    .button("Teleport freecam to a specific location") //3
                    .button("Teleport to a player in the same dimension") //4
                    .button("Exit freecam and teleport to the starting location") //5
                    .button("Exit freecam at current freecam location") //6
                    .show(p).then((response) => {
                    if (response.canceled === true) return;

                    if (!this.isInExpFreeCam(p.name)) {
                        p.sendMessage("§cError, another user has recently disabled your freecam.");
                        p.playSound("au.error");

                    } else {
                        const { selection } = response;

                        switch (selection) {
                            case 0:
                                this.init(p);
                                break;

                            case 1: //Auto chunk load
                                this.#manageExpFreeCam.autoChunkLoadGUI(p);
                                break;

                            case 2: //Tp to starting location
                                this.#manageExpFreeCam.tpStartLoc(p);
                                break;

                            case 3: //Tp to specific location
                                this.#manageExpFreeCam.tpSpecificLoc(p);
                                break;

                            case 4: //Tp to player in same dimension
                                this.#manageExpFreeCam.tpToPlayerSameDim(p);
                                break;

                            case 5: //Exit and tp to starting location
                                this.#manageExpFreeCam.startLocExit(p);
                                break;

                            case 6: //Exit at current location
                                this.#manageExpFreeCam.tpExit(p);
                                break;

                            default:
                                break;
                        }
                    }
                });
            }
        }
    }

    #manageExpFreeCam = {
        /**
         * @param { Player } p
         */
        autoChunkLoadGUI: (p) => {
            const data = databases.freeCam.get(p.name);
            const form = new ActionFormData()
                .title("§lAuto chunk load")
                .body("Select an option")
                .button("§l<-- Back", "textures/icons/back.png")
                .button(`§lState:§r ${data.autoChunkLoad.enabled ? "§aON" : "§cOFF"}§r\n` +
                    "§8[ §b§oClick to toggle§r §8]§r");
            if (data.autoChunkLoad.enabled) {
                form.button(`Radius: §6${data.autoChunkLoad.radius}§r\n` +
                    "§8[ §b§oClick to edit§r §8]§r")
                    .button(`Load time: §6${data.autoChunkLoad.loadTime}§r\n` +
                        "§8[ §b§oClick to edit§r §8]§r");
            }
            form.show(p).then((response) => {
                if (response.canceled === true) return;

                if (!this.isInExpFreeCam(p.name)) {
                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                    p.playSound("au.error");

                } else {
                    const { selection } = response;

                    switch (selection) {
                        case 0: //Back
                            this.#manageFreeCamGUI(p);
                            break;

                        case 1: { //Toggle state
                            const data = databases.freeCam.get(p.name);
                            data.autoChunkLoad.enabled = !data.autoChunkLoad.enabled;
                            databases.freeCam.set(p.name, data);
                            this.#manageExpFreeCam.autoChunkLoadGUI(p);
                        }
                            break;

                        case 2: { //Edit radius
                            new ModalFormData()
                                .title("§lAuto chunk load:§r radius")
                                .slider("When the distance between the location of the last time new chunks were loaded and your current location is higher than this value, new chunks will be loaded.\n\n§l§bRadius§r §3(chunks)§r", 1, 40, 1, databases.freeCam.get(p.name).autoChunkLoad.radius)
                                .show(p).then(result => {
                                if (result.canceled === true) return this.#manageExpFreeCam.autoChunkLoadGUI(p);

                                if (!this.isInExpFreeCam(p.name)) {
                                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                                    p.playSound("au.error");

                                } else {
                                    const radius = result.formValues[0];
                                    try {
                                        const data = databases.freeCam.get(p.name);
                                        data.autoChunkLoad.radius = radius;

                                        databases.freeCam.set(p.name, data);

                                        p.sendMessage(`§aThe auto chunk load radius has been set successfully to §b${radius} chunks§a.`);
                                        p.playSound("au.success");
                                        this.#manageExpFreeCam.autoChunkLoadGUI(p);
                                    } catch (e) {
                                        p.sendMessage("§cError, couldn't change the auto chunk load §4radius§c.");
                                        p.playSound("au.error");
                                    }
                                }
                            });
                        }
                            break;

                        case 3: { //Edit load time
                            new ModalFormData()
                                .title("§lAuto chunk load:§r load time")
                                .slider("The duration, in seconds, for loading chunks.\n\n§l§bTime§r §3(seconds)§r", 5, 30, 1, databases.freeCam.get(p.name).autoChunkLoad.loadTime)
                                .show(p).then(result => {
                                if (result.canceled === true) return this.#manageExpFreeCam.autoChunkLoadGUI(p);

                                if (!this.isInExpFreeCam(p.name)) {
                                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                                    p.playSound("au.error");

                                } else {
                                    const time = result.formValues[0];
                                    try {
                                        const data = databases.freeCam.get(p.name);
                                        data.autoChunkLoad.loadTime = time;

                                        databases.freeCam.set(p.name, data);

                                        p.sendMessage(`§aThe auto chunk load load time has been set successfully to §b${time} seconds§a.`);
                                        p.playSound("au.success");
                                        this.#manageExpFreeCam.autoChunkLoadGUI(p);
                                    } catch (e) {
                                        p.sendMessage("§cError, couldn't change the auto chunk load §4load time§c.");
                                        p.playSound("au.error");
                                    }
                                }
                            });
                        }
                            break;

                        default:
                            break;
                    }
                }
            });
        },
        /**
         * @param { Player } p
         */
        tpStartLoc: (p) => {
            const startLoc = databases.freeCam.get(p.name).startLoc;
            new MessageFormData()
                .title("§lTeleport to the starting loc.")
                .body(`Are you sure you want to teleport your freecam to the starting location?\n§l§bStarting location:\n§rX: ${startLoc.x.toFixed(2)}, Y: ${startLoc.y.toFixed(2)}, Z: ${startLoc.z.toFixed(2)}, ${toFancyDim(databases.freeCam.get(p.name).lastDimension)}`)
                .button1("No")
                .button2("Yes")
                .show(p).then(async result => {
                if (result.canceled === true || result.selection === 0) return this.#manageFreeCamGUI(p);

                if (!this.isInExpFreeCam(p.name)) {
                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                    p.playSound("au.error");

                } else {
                    try {
                        p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                        await delay(40);

                        const data = databases.freeCam.get(p.name);
                        const camStartLoc = utils.deepClone(data.startLoc);
                        camStartLoc.y = camStartLoc.y + 2;
                        data.locOverride = camStartLoc;
                        databases.freeCam.set(p.name, data);

                        await new Promise(async tp => {
                            while (databases.freeCam.get(p.name).locOverride) {
                                p.runCommand("camera @s fade time 0 0.3 1 color 0 0 0");
                                await delay(2);
                            }
                            tp();
                        });
                        p.sendMessage("§bTeleported!");
                        p.playSound("au.success");
                    } catch (e) {
                        console.warn(e);
                        p.sendMessage("§cError, couldn't teleport you to the §4starting location§c.");
                        p.playSound("au.error");
                    }
                }
            });
        },
        /**
         * @param { Player } p
         */
        tpSpecificLoc: (p) => {
            const { lastCamLoc } = databases.freeCam.get(p.name);
            new ModalFormData()
                .title(`§lTp to a specific loc. in your dim.`)
                .textField(`§bYour current freecam coordinates are:§r\nX: ${lastCamLoc.x.toFixed(2)}, Y: ${lastCamLoc.y.toFixed(2)}, Z: ${lastCamLoc.z.toFixed(2)}\n\nWrite below the coordinates you want to teleport to. For example: -165 68 250 or -164.50 68.00 250.50`, "e.g. -165 68 250")
                .show(p).then(async result => {
                if (result.canceled === true) return this.#manageFreeCamGUI(p);

                if (!this.isInExpFreeCam(p.name)) {
                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                    p.playSound("au.error");

                } else {
                    const rawCoords = result.formValues[0];
                    const regexp = /^-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? -?\d+(?:\.\d+)?$/;

                    if (rawCoords.trim() === "") {
                        p.sendMessage("§cError, please enter the coordinates you want to teleport to.");
                        p.playSound("au.error");

                    } else if (!regexp.test(rawCoords.trim())) {
                        p.sendMessage(`§cError, §4${rawCoords}§c are not valid coordinates. Make sure you haven't written characters like commas or any extra space.`);
                        p.playSound("au.error");

                    } else {
                        try {
                            const coords = rawCoords.split(" ").map(coord => parseFloat(coord));
                            p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                            await delay(40);
                            const data = databases.freeCam.get(p.name);
                            data.locOverride = { x: coords[0], y: coords[1], z: coords[2] };
                            databases.freeCam.set(p.name, data);
                            await new Promise(async tp => {
                                while (databases.freeCam.get(p.name).locOverride) {
                                    p.runCommand("camera @s fade time 0 0.3 1 color 0 0 0");
                                    await delay(2);
                                }
                                tp();
                            });
                            p.sendMessage("§bTeleported!");
                            p.playSound("au.success");
                        } catch (e) {
                            console.warn(e);
                            p.sendMessage(`§cError, couldn't teleport you to §4${rawCoords}§c.`);
                            p.playSound("au.error");
                        }
                    }
                }
            });
        },
        /**
         * @param { Player } p
         */
        tpToPlayerSameDim: (p) => {
            const rawPlayers = world.getPlayers().filter(player => player.dimension.id === p.dimension.id);
            const players = rawPlayers.map(player => player.name);
            new ModalFormData()
                .title("§lTeleport to a player")
                .dropdown("Choose a player in your dimension.\n§cPlease note that you won't be able to actually see the player if they're too far away, due to Minecraft limitations.", players)
                .show(p).then(async result => {
                if (result.canceled === true) return this.#manageFreeCamGUI(p);
                const selectedRawPlayer = rawPlayers[result.formValues[0]];
                const player = selectedRawPlayer.name;

                if (!this.isInExpFreeCam(p.name)) {
                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                    p.playSound("au.error");

                } else if (!selectedRawPlayer.isValid()) {
                    p.sendMessage(`§cError, §4${player}§c has recently left.`);
                    p.playSound("au.error");

                } else if (selectedRawPlayer.dimension.id !== p.dimension.id) {
                    const playerDim = toFancyDim(selectedRawPlayer.dimension.id).substring(2);
                    p.sendMessage(`§cError, §4${player}§c is now in ${playerDim.startsWith("The") ? `§4${playerDim}` : `the §4${playerDim}`}§c.`);
                    p.playSound("au.error");

                } else {
                    try {
                        p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                        await delay(40);

                        const data = databases.freeCam.get(p.name);
                        data.locOverride = selectedRawPlayer.getHeadLocation();
                        databases.freeCam.set(p.name, data);

                        await new Promise(async tp => {
                            while (databases.freeCam.get(p.name).locOverride) {
                                p.runCommand("camera @s fade time 0 0.3 1 color 0 0 0");
                                await delay(2);
                            }
                            tp();
                        });

                        p.sendMessage("§bTeleported!");
                        p.playSound("au.success");
                    } catch (e) {
                        console.warn(e);
                        p.sendMessage(`§cError, couldn't teleport you to §4${player}§c.`);
                        p.playSound("au.error");
                    }
                }
            });
        },
        /**
         * @param { Player } p
         */
        startLocExit: (p) => {
            const { startLoc } = databases.freeCam.get(p.name);
            new MessageFormData()
                .title("§lExit at the starting location")
                .body(`Are you sure you want to exit your freecam at the starting location?\n§l§bStarting location:\n§rX: ${startLoc.x.toFixed(2)}, Y: ${startLoc.y.toFixed(2)}, Z: ${startLoc.z.toFixed(2)}`)
                .button1("No")
                .button2("Yes")
                .show(p).then(async result => {
                if (result.canceled === true || result.selection === 0) return this.#manageFreeCamGUI(p);

                if (!this.isInExpFreeCam(p.name)) {
                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                    p.playSound("au.error");

                } else {
                    try {
                        p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                        await delay(40);

                        let data = databases.freeCam.get(p.name);
                        data.hasToLeaveFreeCam = true;
                        databases.freeCam.set(p.name, data);

                        await new Promise(async res => {
                            while (databases.freeCam.get(p.name)) {
                                p.runCommand("camera @s fade time 0 0.3 1 color 0 0 0");
                                await delay(2);
                            }
                            res();
                        });

                        p.sendMessage("§bExperimental Freecam§a has been disabled successfully at the starting location.");
                        p.playSound("au.success");
                    } catch (e) {
                        console.warn(e);
                        p.sendMessage("§cError, couldn't exit freecam and teleport you to the starting location.");
                        p.playSound("au.error");
                    }
                }
            });
        },
        /**
         * @param { Player } p
         */
        tpExit: (p) => {
            const { lastCamLoc } = databases.freeCam.get(p.name);
            new MessageFormData()
                .title("§lExit at current freecam loc.")
                .body(`Are you sure you want to §bexit§r the freecam mode at your §bcurrent freecam location§r?\n§l§bCurrent freecam location:\n§rX: ${lastCamLoc.x.toFixed(2)}, Y: ${lastCamLoc.y.toFixed(2)}, Z: ${lastCamLoc.z.toFixed(2)}`)
                .button1("No")
                .button2("Yes")
                .show(p).then(async result => {
                if (result.canceled === true || result.selection === 0) return this.#manageFreeCamGUI(p);

                if (!this.isInExpFreeCam(p.name)) {
                    p.sendMessage("§cError, another user has recently disabled your freecam.");
                    p.playSound("au.error");

                } else {
                    try {
                        p.runCommand("camera @s fade time 2 1 1 color 0 0 0");
                        await delay(40);

                        let data = databases.freeCam.get(p.name);
                        data.hasToLeaveFreeCam = true;
                        databases.freeCam.set(p.name, data);

                        const oldCamLoc = utils.deepClone(data.lastCamLoc);
                        oldCamLoc.y = oldCamLoc.y - 2;
                        p.teleport(oldCamLoc);

                        await new Promise(async res => {
                            while (databases.freeCam.get(p.name)) {
                                p.runCommand("camera @s fade time 0 0.3 1 color 0 0 0");
                                await delay(2);
                            }
                            res();
                        });

                        p.sendMessage("§bExperimental Freecam§a has been disabled successfully at your current freecam location.");
                        p.playSound("au.success");
                    } catch (e) {
                        console.warn(e);
                        p.sendMessage("§cError, couldn't exit §4Experimental Freecam§c.");
                        p.playSound("au.error");
                    }
                }
            });
        }
    }

    /**
     * @param { String } player
     * @returns { Boolean }
     */
    isInFreeCam(player) {
        return databases.freeCam.get(player)?.hasToLeaveFreeCam === false;
    }

    /**
     * @param { String } player
     * @returns { Boolean }
     */
    isInSpecFreeCam(player) {
        const data = databases.freeCam.get(player);
        return data?.mode === "spectatorFreeCam" && data?.hasToLeaveFreeCam === false;
    }

    /**
     * @param { String } player
     * @returns { Boolean }
     */
    isInExpFreeCam(player) {
        const data = databases.freeCam.get(player);
        return data?.mode === "experimentalFreeCam" && data?.hasToLeaveFreeCam === false;
    }
}

export const freeCam = new FreeCam();

let activeExpFreeCams = [];

system.runInterval(() => {
    if (!databases.loaded) return;
    for (const player in databases.freeCam.getTable()) {
        const rawPlayer = world.getPlayers({ name: player })[0];
        const playerData = databases.freeCam.get(player);

        if (rawPlayer) {
            if (freeCam.isInSpecFreeCam(player) && playerData.lastDimension === undefined) { //If the player has joined for the first time since freecam was enabled for them
                let newTable = utils.deepClone(playerData);
                //Fill properties
                newTable.lastDimension = rawPlayer.dimension.id;
                newTable.startLoc = rawPlayer.location;
                newTable.lastGameMode = rawPlayer.getGameMode();
                //Save properties
                databases.freeCam.set(player, newTable);

            } else if (freeCam.isInExpFreeCam(player) && playerData.startLoc === undefined) {
                let newTable = utils.deepClone(playerData);
                //Fill properties
                newTable.startLoc = rawPlayer.location;
                newTable.lastGameMode = rawPlayer.getGameMode();
                //Save properties
                databases.freeCam.set(player, newTable);
            }
            if (playerData.mode === "spectatorFreeCam") { //Spectator Freecam
                if (playerData.hasToLeaveFreeCam) {
                    rawPlayer.setGameMode(playerData.lastGameMode);
                    databases.freeCam.delete(player);

                } else {
                    rawPlayer.setGameMode("spectator"); //Evitar con beforegamemodechange?
                }

            } else { //Experimental freecam
                if (!activeExpFreeCams.includes(player)) {
                    activeExpFreeCams.push(player);
                    handleExpFreecam(rawPlayer, playerData.startLoc, toFancyDim(rawPlayer.dimension.id));
                }
            }
        }
    }
}, 1);

/**
 *
 * @param { Player } rawPlayer
 * @param { Vector3 } startLocation
 */
async function handleExpFreecam(rawPlayer, startLocation, dimension) {
    const player = rawPlayer.name;
    const startLoc = {};
    Object.assign(startLoc, startLocation);
    let currentCamLoc = {};

    if (!databases.freeCam.get(player).lastCamLoc.x) {
        Object.assign(currentCamLoc, startLoc);
        currentCamLoc.y = currentCamLoc.y + 2;
    } else {
        Object.assign(currentCamLoc, databases.freeCam.get(player).lastCamLoc);
    }

    let lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };
    let lastVelCount = 0;
    let slotControls = {
        speed: databases.freeCam.get(player).speed,
        slot: rawPlayer.selectedSlotIndex,
        lastSec: 0,
        slotISO: ""
    };
    let gamemode = "";

    let ticks = 0;

    const run = system.runInterval(() => {
        const data = databases.freeCam.get(player);
        if (data.hasToLeaveFreeCam === true && !data.autoChunkLoad.loading) {

            databases.freeCam.delete(player);
            activeExpFreeCams.splice(activeExpFreeCams.indexOf(player), 1);
            rawPlayer.camera.clear();
            system.clearRun(run);
            return;
        }
        if (!rawPlayer.isValid() || (!freeCam.isInExpFreeCam(player) && !data?.autoChunkLoad.loading)) {
            activeExpFreeCams.splice(activeExpFreeCams.indexOf(player), 1);
            system.clearRun(run);
            return;
        }

        if (rawPlayer.getGameMode() === "spectator" && !data.autoChunkLoad.loading) {
            rawPlayer.setGameMode(gamemode);
        }

        if (gamemode !== rawPlayer.getGameMode() && rawPlayer.getGameMode() === "creative" && !data.autoChunkLoad.loading) {
            rawPlayer.sendMessage("§4Warning, §cif you're in Creative mode, make sure not to fly, as you won't be able to ascend with the freecam.");
        }

        if (data.autoChunkLoad.enabled) {
            if (data.autoChunkLoad.forceLoad && !data.autoChunkLoad.loading) {
                data.autoChunkLoad.loading = true;
                data.autoChunkLoad.lastLoadLoc = currentCamLoc;
                data.autoChunkLoad.forceLoad = false;
                databases.freeCam.set(player, data);

                //Begin loading
                rawPlayer.setGameMode("spectator");
                Object.assign(startLoc, currentCamLoc);
                rawPlayer.teleport(currentCamLoc);

            } else if (!data.autoChunkLoad.loading) {
                const radius = data.autoChunkLoad.radius;
                const lastLoadLoc = Object.keys(data.autoChunkLoad.lastLoadLoc).length === 0 ? startLoc : data.autoChunkLoad.lastLoadLoc;
                const cameraLoc = currentCamLoc;
                const distance = Math.sqrt(Math.pow((cameraLoc.x - lastLoadLoc.x), 2) + Math.pow((cameraLoc.y - lastLoadLoc.y), 2) + Math.pow((cameraLoc.z - lastLoadLoc.z), 2));

                if (distance >= radius * 16) {
                    const newData = data;
                    newData.autoChunkLoad.loading = true;
                    newData.autoChunkLoad.lastLoadLoc = cameraLoc;
                    databases.freeCam.set(player, newData);

                    //Begin loading
                    rawPlayer.setGameMode("spectator");
                    Object.assign(startLoc, cameraLoc);
                    rawPlayer.teleport(cameraLoc);
                }
            } else {
                //If loading is complete
                if (ticks >= data.autoChunkLoad.loadTime * TicksPerSecond) {
                    Object.assign(startLoc, data.startLoc);
                    rawPlayer.teleport(startLoc);
                    rawPlayer.setGameMode(data.lastGameMode);

                    const newData = data;
                    newData.autoChunkLoad.loading = false;
                    databases.freeCam.set(player, newData);
                    ticks = 0;
                } else { //If it's still loading
                    //Continue loading
                    rawPlayer.setGameMode("spectator");
                    if (!rawPlayer.dimension.getPlayers({ name: player, location: data.autoChunkLoad.lastLoadLoc, maxDistance: 3 })[0]) {
                        Object.assign(startLoc, data.autoChunkLoad.lastLoadLoc);
                        rawPlayer.teleport(startLoc);
                    }

                    ticks++;
                }
            }
        }

        handleSlotControls(rawPlayer, slotControls);
        data.speed = slotControls.speed;
        databases.freeCam.set(player, data);

        const pVelocity = rawPlayer.getVelocity();
        const pRot = rawPlayer.getRotation();
        if (data.locOverride && !data.autoChunkLoad.loading) { //Location override, used for teleporting the freecam
            let data = databases.freeCam.get(player);
            Object.assign(currentCamLoc, data.locOverride);
            lastVelCount = 0;
            lastVelocity = { x: 0, y: 0, z: 0 };
            delete data.locOverride;
            databases.freeCam.set(player, data);

        } else {
            currentCamLoc = {
                x: currentCamLoc.x + (lastVelocity.x !== 0.00 ? lastVelocity.x : pVelocity.x) * slotControls.speed / (rawPlayer.isSneaking ? 0.4 : 1),
                y: currentCamLoc.y,
                z: currentCamLoc.z + (lastVelocity.z !== 0.00 ? lastVelocity.z : pVelocity.z) * slotControls.speed / (rawPlayer.isSneaking ? 0.4 : 1)
            };
        }

        if (rawPlayer.isJumping) {
            Object.assign(currentCamLoc, { y: currentCamLoc.y + 0.35 * slotControls.speed });

        } else if (rawPlayer.isSneaking) {
            Object.assign(currentCamLoc, { y: currentCamLoc.y - 0.35 * slotControls.speed });
        }

        rawPlayer.camera.setCamera("au:freecam", {
            location: currentCamLoc,
            easeOptions: { easeTime: 0.05, easeType: EasingType.InOutSine },
            rotation: pRot
        });

        //Save the current camera location
        Object.assign(data.lastCamLoc, currentCamLoc);
        databases.freeCam.set(player, data);

        if (rawPlayer.location.x > startLoc.x + 1.25 || rawPlayer.location.x < startLoc.x - 1.25 || rawPlayer.location.y > startLoc.y + 1.5 || rawPlayer.location.y < startLoc.y - 1.5 || rawPlayer.location.z > startLoc.z + 1.25 || rawPlayer.location.z < startLoc.z - 1.25) {
            if (lastVelCount === 0) {
                lastVelocity = pVelocity;
            }
            rawPlayer.teleport(startLoc);
        } else if (lastVelCount >= 3) {
            lastVelCount = 0;
            lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };
        }
        if ((lastVelCount >= 2 && areObjectsEqual(pVelocity, {
            x: 0.00,
            y: 0.00,
            z: 0.00
        })) || (lastVelocity.x > 0.05 && pVelocity.x < -0.05) || (lastVelocity.x < -0.05 && pVelocity.x > 0.05) || (lastVelocity.z > 0.05 && pVelocity.z < -0.05) || (lastVelocity.z < -0.05 && pVelocity.z > 0.05)) {
            lastVelCount = 0;
            lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };

        } else if (!areObjectsEqual(lastVelocity, { x: 0.00, y: 0.00, z: 0.00 })) {
            lastVelCount++;
        }

        const actionBar = `X: ${currentCamLoc.x.toFixed(2)}, Y: ${currentCamLoc.y.toFixed(2)}, Z: ${currentCamLoc.z.toFixed(2)}, ${dimension}\n§l§bSpeed: §r§s${slotControls.speed.toFixed(1)}${rawPlayer.isFlying && rawPlayer.getGameMode() !== "spectator" ? "\n§cYou can't ascend if your character is flying." : ""}`;
        rawPlayer.onScreenDisplay.setActionBar(actionBar);

        gamemode = rawPlayer.getGameMode();
    }, 1);
}

function handleSlotControls(rawPlayer, slotControls) {
    let newSpeed = slotControls.speed;
    let newISO = slotControls.slotISO;
    const momentISO = moment(newISO, moment.ISO_8601);

    if (slotControls.slot !== rawPlayer.selectedSlotIndex) { //If the slot has changed
        newISO = "";
    } else {
        // world.sendMessage(`${JSON.stringify(momentISO)}`);
        if (rawPlayer.selectedSlotIndex === 7 || rawPlayer.selectedSlotIndex === 8 || rawPlayer.selectedSlotIndex === 6) {
            if (momentISO.isValid()) {
                const now = moment();
                const diff = now.diff(momentISO, 'seconds', true);
                if (diff >= 1) {
                    const secondsMod = diff % 1;

                    if (secondsMod <= slotControls.lastSec) {
                        if (rawPlayer.selectedSlotIndex === 6) {
                            const data = databases.freeCam.get(rawPlayer.name);
                            data.autoChunkLoad.forceLoad = true;
                            databases.freeCam.set(rawPlayer.name, data);
                            rawPlayer.selectedSlotIndex = 5;
                        } else {
                            let step = 0.2;
                            if (diff >= 15) {
                                step = 5;
                            } else if (diff >= 10) {
                                step = 1;
                            } else if (diff >= 6) {
                                step = 0.5;
                            }

                            if (rawPlayer.selectedSlotIndex === 7) {
                                newSpeed = Math.round((slotControls.speed + step) * 100) / 100;
                            } else {
                                if (slotControls.speed > step) {
                                    newSpeed = Math.round((slotControls.speed - step) * 100) / 100;
                                }
                            }
                        }
                        rawPlayer.playSound("note.bell");
                    }
                    slotControls.lastSec = secondsMod;
                }
            } else {
                newISO = moment().toISOString();
            }
        } else {
            newISO = "";
        }
    }
    slotControls.slot = rawPlayer.selectedSlotIndex;
    slotControls.speed = newSpeed;
    slotControls.slotISO = newISO;
}