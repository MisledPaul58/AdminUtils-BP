import { Player, system, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { adminUtils, areObjectsEqual, isValidUsername } from "../main";
import { database } from "../utils/database";

class FreeCam {
    /**
     * @param { Player } player 
     */
    init(player) {
        world.sendMessage(`${world.getDynamicPropertyIds()}`);
        world.sendMessage(`${JSON.stringify(database.getTable("Freecam"))}`);
        new ActionFormData()
            .title("Freecam menu")
            .body("Select a freecam mode")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Spectator freecam")
            .button("Freecam [Experimental]") //warn users that if they are in Creative mode they mustnt fly
            .show(player).then((response) => {
                if (response.canceled === true) return;
                const { selection } = response;

                switch (selection) {
                    case 0: //Back
                        adminUtils(player);
                        break;
                    case 1: { //Spectator freecam
                        new ActionFormData()
                            .title("Spectator freecam")
                            .body("Select an option")
                            .button("§l<-- Back", "textures/icons/back.png")
                            .button("Enable spectator freecam for a player")
                            .button("Disable spectator freecam for a player")
                            .show(player).then((response) => {
                                if (response.canceled === true) return;

                                switch (response.selection) {
                                    case 0:
                                        this.init(player);
                                        break;
                                    case 1:
                                        this.#enableSpecFreeCamGUI(player);
                                        break;
                                    case 2:
                                        this.#disableSpecFreeCamGUI(player);
                                        break;
                                    default:
                                        break;
                                }
                            });
                    } break;
                    case 2: { //Freecam [Experimental]

                    } break;
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
            .title("Enable spectator freecam")
            .body("Select an option")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Type an online player instead", "textures/icons/pencil.png");
        if (!this.isInFreecam(p.name)) form.button("Enable for myself");

        for (const player of world.getPlayers().map(player => player.name)) {
            if (!this.isInFreecam(player) && player !== p.name) {
                form.button(player);
                availablePlayers.push(player);
            }
        }

        form.show(p).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;

            if (selection === 0) { //Back
                this.init(p);

            } else if (selection === 1) { //Type manually
                new ModalFormData()
                    .title("Enable spectator freecam")
                    .textField("Type below the player you would like to enable the spectator freecam for.", "Player's name")
                    .show(p).then(result => {
                        if (result.canceled === true) return this.#enableSpecFreeCamGUI(p);

                        const specifiedPlayer = result.formValues[0];
                        if (!isValidUsername(specifiedPlayer)) {
                            p.sendMessage("§cError, the username you entered is invalid.");
                            p.playSound("au.error");

                        } else if (this.isInFreecam(specifiedPlayer)) {
                            p.sendMessage("§cError, the specified player is already in spectator freecam.");
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
                                        lastGameMode: rawPlayer.getGameMode()
                                    };
                                } else {
                                    data = {
                                        mode: "spectatorFreeCam",
                                        lastDimension: undefined,
                                        lastLoc: undefined,
                                        lastGameMode: undefined
                                    };
                                }
                                database.set("Freecam", specifiedPlayer, data);
                                p.sendMessage(`§aSpectator freecam has been enabled successfully for §b${specifiedPlayer}§a.`);
                                p.playSound("au.success");
                            } catch (e) {
                                console.warn(e);
                                p.sendMessage(`§cError, couldn't enable spectator freecam for §4${specifiedPlayer}§c.`);
                                p.playSound("au.error");
                            }
                        }
                    });

            } else if (selection === 2) { //Enable for myself
                new MessageFormData()
                    .title("Enable spectator freecam")
                    .body("Are you sure you want to enable spectator freecam for §byourself§r?")
                    .button1("No")
                    .button2("Yes")
                    .show(p).then(result => {
                        if (result.canceled === true) return this.#enableSpecFreeCamGUI(p);
                        if (result.selection === 0) {
                            this.#enableSpecFreeCamGUI(p);

                        } else {
                            if (this.isInFreecam(p.name)) { //In case another player enabled it for them
                                p.sendMessage("§cError, you are already in spectator freecam.");
                                p.playSound("au.error");

                            } else {
                                try {
                                    const data = {
                                        mode: "spectatorFreeCam",
                                        lastDimension: p.dimension.id,
                                        lastLoc: p.location,
                                        lastGameMode: p.getGameMode()
                                    };
                                    database.set("Freecam", p.name, data);
                                    p.sendMessage(`§aSpectator freecam has been enabled successfully for you.`);
                                    p.playSound("au.success");
                                } catch (e) {
                                    console.warn(e);
                                    p.sendMessage("§cError, couldn't enable spectator freecam.");
                                    p.playSound("au.error");
                                }
                            }
                        }
                    });

            } else if (selection >= 3) { //Player selection
                const selectedPlayer = availablePlayers[selection - 3];

                new MessageFormData()
                    .title("Enable spectator freecam")
                    .body(`Are you sure you want to enable spectator freecam for §b${selectedPlayer}§r?`)
                    .button1("No")
                    .button2("Yes")
                    .show(p).then(result => {
                        if (result.canceled === true) return this.#enableSpecFreeCamGUI(p);
                        if (result.selection === 0) {
                            this.#enableSpecFreeCamGUI(p);

                        } else {
                            if (this.isInFreecam(selectedPlayer)) {
                                p.sendMessage(`§cError, §4${selectedPlayer}§c has recently entered spectator freecam.`);
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
                                            lastGameMode: rawPlayer.getGameMode()
                                        };
                                    } else {
                                        data = {
                                            mode: "spectatorFreeCam",
                                            lastDimension: database.getTable("PlayersData")[selectedPlayer].lastDimension,
                                            lastLoc: database.getTable("PlayersData")[selectedPlayer].lastLoc,
                                            lastGameMode: database.getTable("PlayersData")[selectedPlayer].lastGameMode
                                        };
                                    }
                                    database.set("Freecam", selectedPlayer, data);
                                    p.sendMessage(`§aSpectator freecam has been enabled successfully for §b${selectedPlayer}§a.`);
                                    p.playSound("au.success");
                                } catch (e) {
                                    console.warn(e);
                                    p.sendMessage(`§cError, couldn't enable spectator freecam for §4${selectedPlayer}§c.`);
                                    p.playSound("au.error");
                                }
                            }
                        }
                    });
            }
        });
    }

    #disableSpecFreeCamGUI(player) {

    }

    /**
     * 
     * @param { String } player 
     * @returns { Boolean }
     */
    isInFreecam(player) {
        return database.keyExists("Freecam", player);
    }
}

export const freeCam = new FreeCam();

let activeExpFreeCams = [];

system.runInterval(() => {
    const table = database.getTable("Freecam");
    for (const player in table) {
        const rawPlayer = world.getPlayers({ name: player })[0];

        if (rawPlayer) {
            if (table[player].lastDimension === undefined) { //If the player has joined for the first time since freecam was enabled for them
                let newTable = table[player];
                //Fill properties
                newTable.lastDimension = rawPlayer.dimension.id;
                newTable.lastLoc = rawPlayer.location;
                newTable.lastGameMode = rawPlayer.getGameMode();
                //Save properties
                database.set("Freecam", player, newTable);
            }
            if (table[player].mode === "spectatorFreeCam") { //Spectator freecam
                rawPlayer.setGameMode("spectator");

            } else { //Experimental freecam
                const playerDim = rawPlayer.dimension.id;
                let dimension = "";
                if (playerDim === "minecraft:overworld") {
                    dimension = '§bOverworld';
                } else if (playerDim === "minecraft:nether") {
                    dimension = '§cNether';
                } else if (playerDim === "minecraft:the_end") {
                    dimension = '§5The End';
                }

                if (!activeExpFreeCams.includes(player)) {
                    activeExpFreeCams.push(player);
                    handleExpFreecam(rawPlayer, table[player].lastLoc, dimension, player);
                }
            }
        }
    }
}, 2);

/**
 * 
 * @param { Player } rawPlayer 
 * @param { Vector3 } startLoc 
 */
async function handleExpFreecam(rawPlayer, startLoc, dimension, player) {
    let currentLoc = startLoc;
    currentLoc.y = currentLoc.y + 2;
    let lastVelocity = { x: 0.00, y: 0.00, z: 0.00 };
    let lastVelCount = 0;
    let gamemode = "";

    const run = system.runInterval(() => {
        if (!rawPlayer.isValid() || !freeCam.isInFreecam(player)) {
            activeExpFreeCams.splice(activeExpFreeCams.indexOf(player), 1);
            system.clearRun(run);
        }
        if (rawPlayer.getGameMode() === "spectator") {
            rawPlayer.setGameMode(gamemode);
        }

        const pVelocity = rawPlayer.getVelocity();
        const pRot = rawPlayer.getRotation();
        currentLoc = { x: currentLoc.x + (lastVelocity.x !== 0.00 ? lastVelocity.x : pVelocity.x) / 0.7 / (rawPlayer.isSneaking ? 0.4 : 1), y: currentLoc.y, z: currentLoc.z + (lastVelocity.z !== 0.00 ? lastVelocity.z : pVelocity.z) / 0.7 / (rawPlayer.isSneaking ? 0.4 : 1) };
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