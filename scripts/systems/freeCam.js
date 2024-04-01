import { Dimension, Player, TicksPerSecond, system, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { databases, adminUtils, areObjectsEqual, delay, isValidUsername, toDimId, toFancyDim } from "../main";

class FreeCam {
    /**
     * @param { Player } p 
     */
    init(p) {
        world.sendMessage(`${world.getDynamicPropertyIds()}`);
        world.sendMessage(`${JSON.stringify(databases.freeCam.getTable())}`);
        let extraButton = 0;
        const form = new ActionFormData()
            .title("Freecam menu")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png");
        if (this.isInFreeCam(p.name)) {
            form.button("§l§8Current freecam\n§r§8[ §b§oClick to manage§r§8 ]");
            extraButton++;
        }
        form.button("Spectator Freecam")
            .button("Freecam [Experimental]") //warn users that if they are in Creative mode they mustnt fly
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
            .button("Enable Spectator Freecam for a player")
            .button("Disable Spectator Freecam for a player")
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
            .button("Enable Experimental Freecam for a player")
            .button("Disable Experimental Freecam for a player")
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
                    default:
                        break;
                }
            });
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
            .button("Enable for myself");

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
                                        lastLoc: rawPlayer.location,
                                        lastGameMode: rawPlayer.getGameMode(),
                                        hasToLeaveFreeCam: false
                                    };
                                } else {
                                    data = {
                                        mode: "spectatorFreeCam",
                                        lastDimension: databases.playerData.get(specifiedPlayer)?.lastDimension, //These keys with undefined values are actually lost during JSON.stringify
                                        lastLoc: databases.playerData.get(specifiedPlayer)?.lastLoc,
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
                                        lastLoc: p.location,
                                        lastGameMode: p.getGameMode(),
                                        hasToLeaveFreeCam: false
                                    };
                                    databases.freeCam.set(p.name, data);
                                    p.sendMessage(`§bSpectator Freecam§a has been enabled successfully for you.`);
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
                                        lastLoc: rawPlayer.location,
                                        lastGameMode: rawPlayer.getGameMode(),
                                        hasToLeaveFreeCam: false
                                    };
                                } else {
                                    data = {
                                        mode: "spectatorFreeCam",
                                        lastDimension: databases.playerData.get(selectedPlayer)?.lastDimension,
                                        lastLoc: databases.playerData.get(selectedPlayer)?.lastLoc,
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
            .button("Disable for myself");

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
            .button("Enable for myself");

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
                                        lastDimension: rawPlayer.dimension.id,
                                        lastLoc: rawPlayer.location,
                                        lastGameMode: rawPlayer.getGameMode(),
                                        autoChunkLoad: {
                                            enabled: true,
                                            radius: 6,
                                            lastLoadLoc: {}
                                        },
                                        hasToLeaveFreeCam: false
                                    };
                                } else {
                                    data = {
                                        mode: "experimentalFreeCam",
                                        lastDimension: databases.playerData.get(specifiedPlayer)?.lastDimension, //These keys with undefined values are actually lost during JSON.stringify
                                        lastLoc: databases.playerData.get(specifiedPlayer)?.lastLoc,
                                        lastGameMode: databases.playerData.get(specifiedPlayer)?.lastGameMode,
                                        autoChunkLoad: {
                                            enabled: true,
                                            radius: 6,
                                            lastLoadLoc: {}
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
                                p.sendMessage("§cError, you are already in Experimental Freecam.");
                                p.playSound("au.error");

                            } else if (this.isInSpecFreeCam(p.name)) {
                                p.sendMessage("§cError, another user has recently enabled Spectator Freecam for you.");
                                p.playSound("au.error");

                            } else {
                                try {
                                    const data = {
                                        mode: "experimentalFreeCam",
                                        lastDimension: p.dimension.id,
                                        lastLoc: p.location,
                                        lastGameMode: p.getGameMode(),
                                        autoChunkLoad: {
                                            enabled: true,
                                            radius: 6,
                                            lastLoadLoc: {}
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
                                        lastDimension: rawPlayer.dimension.id,
                                        lastLoc: rawPlayer.location,
                                        lastGameMode: rawPlayer.getGameMode(),
                                        autoChunkLoad: {
                                            enabled: true,
                                            radius: 6,
                                            lastLoadLoc: {}
                                        },
                                        hasToLeaveFreeCam: false
                                    };
                                } else {
                                    data = {
                                        mode: "experimentalFreeCam",
                                        lastDimension: databases.playerData.get(selectedPlayer)?.lastDimension,
                                        lastLoc: databases.playerData.get(selectedPlayer)?.lastLoc,
                                        lastGameMode: databases.playerData.get(selectedPlayer)?.lastGameMode,
                                        autoChunkLoad: {
                                            enabled: true,
                                            radius: 6,
                                            lastLoadLoc: {}
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
            .button("Disable for myself");

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
                    .button("§l<-- Back", "textures/icons/back.png")
                    .button("Teleport freecam to the starting location")
                    .button("Teleport freecam to a specific location")
                    .button("Exit freecam and teleport to the starting location")
                    .button("Exit freecam at current location")
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
                                    const startLoc = databases.freeCam.get(p.name).lastLoc;
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
                                                    p.teleport(data.lastLoc, { dimension: world.getDimension(data.lastDimension) });
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
                                } break;

                                case 2: { //Tp to specific location
                                    const dimensions = ["§bOverworld", "§cNether", "§5The End"];
                                    new ModalFormData()
                                        .title("§lTeleport to a specific location")
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
                                                        p.teleport({ x: coords[0], y: coords[1], z: coords[2] }, { dimension: world.getDimension(dimension) });
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

                                case 3: { //Exit and tp to starting location
                                    const startLoc = databases.freeCam.get(p.name).lastLoc;
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
                                                    p.teleport(data.lastLoc, { dimension: world.getDimension(data.lastDimension) });
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
                                } break;

                                case 4: { //Exit at current location
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
                                } break;

                                default:
                                    break;
                            }
                        }
                    });
            } else {
                new ActionFormData()
                    .title("§lManage §bExperimental Freecam")
                    .body("Select an option")
                    .button("§l<-- Back", "textures/icons/back.png")
                    .button("§lAuto chunk load:§r ONOROFF\n[ §b§oClick to toggle§r ]")
                    .button("Teleport freecam to the starting location")
                    .button("Teleport freecam to a specific location")
                    .button("Teleport to a player in the same dimension")
                    .button("Exit freecam and teleport to the starting location")
                    .button("Exit freecam at current location")
                    .show(p).then(result => {
                        if (result.canceled === true) return;


                    });
            }
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
            if (playerData.lastDimension === undefined) { //If the player has joined for the first time since freecam was enabled for them
                let newTable = playerData;
                //Fill properties
                newTable.lastDimension = rawPlayer.dimension.id;
                newTable.lastLoc = rawPlayer.location;
                newTable.lastGameMode = rawPlayer.getGameMode();
                //Save properties
                databases.freeCam.set(player, newTable);
            }
            if (playerData.mode === "spectatorFreeCam") { //Spectator Freecam
                rawPlayer.setGameMode("spectator"); //Evitar con beforegamemodechange?

            } else { //Experimental freecam
                if (!activeExpFreeCams.includes(player)) {
                    activeExpFreeCams.push(player);
                    handleExpFreecam(rawPlayer, playerData.lastLoc, toFancyDim(rawPlayer.dimension.id));
                }
            }
        }
    }
}, 1);

/**
 * 
 * @param { Player } rawPlayer 
 * @param { Vector3 } startLoc 
 */
async function handleExpFreecam(rawPlayer, startLoc, dimension) {
    const player = rawPlayer.name;
    let currentLoc = startLoc;
    currentLoc.y = currentLoc.y + 2;
    let lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };
    let lastVelCount = 0;
    let gamemode = "";

    const run = system.runInterval(() => {
        if (!rawPlayer.isValid() || !freeCam.isInExpFreeCam(player)) {
            activeExpFreeCams.splice(activeExpFreeCams.indexOf(player), 1);
            system.clearRun(run);
        }
        if (rawPlayer.getGameMode() === "spectator") {
            rawPlayer.setGameMode(gamemode);
        }

        const pVelocity = rawPlayer.getVelocity();
        const pRot = rawPlayer.getRotation();
        if (databases.freeCam.get(player).locOverride) { //Location override, used for teleporting the freecam
            let data = databases.freeCam.get(player);
            currentLoc = data.locOverride;
            lastVelCount = 0;
            lastVelocity = { x: 0, y: 0, z: 0 };
            delete data.locOverride;
            databases.freeCam.set(player, data);

        } else {
            currentLoc = { x: currentLoc.x + (lastVelocity.x !== 0.00 ? lastVelocity.x : pVelocity.x) / 0.7 / (rawPlayer.isSneaking ? 0.4 : 1), y: currentLoc.y, z: currentLoc.z + (lastVelocity.z !== 0.00 ? lastVelocity.z : pVelocity.z) / 0.7 / (rawPlayer.isSneaking ? 0.4 : 1) };
        }
        if (rawPlayer.isJumping) {
            world.sendMessage("jumping");
            Object.assign(currentLoc, { y: currentLoc.y + 0.35 });

        } else if (rawPlayer.isSneaking) {
            world.sendMessage("sneaking");
            Object.assign(currentLoc, { y: currentLoc.y - 0.35 });
        }

        rawPlayer.camera.setCamera("au:tpanimation", { location: currentLoc, easeOptions: { easeTime: 0.05, easeType: EasingType.InOutSine }, rotation: pRot });

        if (rawPlayer.location.x > startLoc.x + 1.25 || rawPlayer.location.x < startLoc.x - 1.25 || rawPlayer.location.y > startLoc.y + 1.5 || rawPlayer.location.y < startLoc.y - 1.5 || rawPlayer.location.z > startLoc.z + 1.25 || rawPlayer.location.z < startLoc.z - 1.25) {
            if (lastVelCount === 0) {
                lastVelocity = pVelocity;
            }
            rawPlayer.teleport(startLoc);
        } else if (lastVelCount >= 3) {
            lastVelCount = 0;
            lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };
        }
        if ((lastVelCount >= 2 && areObjectsEqual(pVelocity, { x: 0.00, y: 0.00, z: 0.00 })) || (lastVelocity.x > 0.05 && pVelocity.x < -0.05) || (lastVelocity.x < -0.05 && pVelocity.x > 0.05) || (lastVelocity.z > 0.05 && pVelocity.z < -0.05) || (lastVelocity.z < -0.05 && pVelocity.z > 0.05)) {
            lastVelCount = 0;
            lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };

        } else if (!areObjectsEqual(lastVelocity, { x: 0.00, y: 0.00, z: 0.00 })) {
            lastVelCount++;
        }

        let actionBar = `X: ${currentLoc.x.toFixed(2)}, Y: ${currentLoc.y.toFixed(2)}, Z: ${currentLoc.z.toFixed(2)}, ${dimension}${rawPlayer.isFlying ? "\n§cYou can't ascend if your character is flying." : ""}`;
        rawPlayer.onScreenDisplay.setActionBar(actionBar);

        if (gamemode !== rawPlayer.getGameMode() && rawPlayer.getGameMode === "creative") {
            rawPlayer.sendMessage("§4Warning, §cif you're in Creative mode, make sure not to fly, as you won't be able to ascend with the freecam.");
        }
        gamemode = rawPlayer.getGameMode();
    }, 1);
}