import { BlockLocation, Location, EntityQueryOptions, world, MinecraftEffectTypes, GameMode } from "@minecraft/server";
import * as GameTest from "@minecraft/server-gametest";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

const overworld = world.getDimension("overworld");
let firstPlayer = false;
let players = [];
let admins = [];
let simtest = 0;

world.events.tick.subscribe(async ({ currentTick }) => {
    players = [...world.getPlayers()];

    try { admins = [...world.scoreboard.getObjective('-au').getParticipants().map(admin => admin.displayName)] } catch (e) { }
    if (players.length === 1 && firstPlayer === false) {
        try { await runCmd(overworld, 'scoreboard objectives add -au dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auban dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add snowProj dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add arrowProj dummy') } catch (e) { }
        if (currentTick % 200 === 0) {
            await runCmd(overworld, `execute @a ~~~ tellraw @s {"rawtext":[{"text":"§l§4§kqww§r§l§bThanks for using Admin Utils! §aMade by §6MisledPaul58§4§kqww§r"}]}`);
            try {
                await runCmd(overworld, 'execute @e[type=au:basedetect] ~ ~ ~ fill ~6 316 ~-6 ~-6 319 ~6 air');
            } catch (e) { }
            try {
                await runCmd(overworld, 'kill @e[type=au:basedetect]');
            } catch (e) { }
            firstPlayer = true;
        }
    }
    try { await runCmd(overworld, 'execute @e[tag=simSpawned] ~~~ fill ~6 316 ~-6 ~-6 319 ~6 air') } catch (e) { }

    for (const player of players) {
        if (player.hasTag("admin")) {
            player.removeTag("admin");
            try {
                await runCmd(overworld, `scoreboard players set "-au${player.name}-au" -au 0`);
                await runCmd(overworld, `execute @a ~~~ tellraw @s {"rawtext": [{ "text": "§aThe player §b${player.name}§a has been successfully added as an admin." }]}`);
            } catch (e) {
                await runCmd(overworld, `execute @a ~~~ tellraw @s {"rawtext": [{ "text": "§cError, couldn't add ${player.name} as an admin, probably it already is." }]}`);
            }
        }
    }
});

world.events.playerJoin.subscribe(async event => {
    if (isBanned(event.player.name)) {
        let reason = getBanReason(event.player.name);
        let bannedBy = getBannedBy(event.player.name);
        await runCmd(overworld, `kick "${event.player.name}" "\n§l§6------------------------------------------------------\n§l§4§k|||||§r§l§cYou have been banned by §4${bannedBy}§c.§4§k|||||§r\n§l§4Reason: §c${reason}\n§r§l§6------------------------------------------------------§r"`);
    } else if (event.player.hasTag("simPlayer")) {
        await runCmd(event.player, 'tag @e[tag=simNotSpawned, c=1] add simSpawned');
        await runCmd(event.player, 'tag @e[tag=simNotSpawned, c=1] remove simNotSpawned');
    }
});

world.events.beforeItemUse.subscribe(data => {
    let player = data.source;
    if (data.item.typeId === "minecraft:stick" && isAdmin(player.name)) {
        adminUtilsGui(player);
    }
});

world.events.entityHurt.subscribe(async event => { //Usar scoreboard y operador terciario para saber está activo o no en el mundo
    const { projectile, damagingEntity, hurtEntity } = event;
    if (damagingEntity.typeId === "minecraft:player" && isLightningBoltEnabled(damagingEntity.nameTag) && projectile) {
        await runCmd(damagingEntity.dimension, `summon lightning_bolt ${hurtEntity.location.x} ${hurtEntity.location.y} ${hurtEntity.location.z}`);
    }
});

function adminUtilsGui(p) {
    const form = new ActionFormData();

    form.title("AdminUtils GUI");
    form.body("Select an option");
    form.button("Admin settings");
    form.button("Admin commands");
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0: {
                adminSettings(p);
                break;
            }
            case 1: {
                adminCommands(p);
                break;
            }
        }
    });
}

function adminSettings(p) {
    const form = new ActionFormData();

    form.title("Admin settings");
    form.body("Select an option");
    form.button("<-- Back");
    form.button("Set an admin");
    form.button("Add an admin");
    form.button("Remove an admin");
    form.button("Show admins");
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0: { //Back 
                adminUtilsGui(p);
            } break;
            case 1: { //Set an admin 
                let form = new ModalFormData();

                form.title("Admin settings");
                form.textField("Set an admin", "Player's name (all admins will be deleted)");
                form.show(p).then(async result => {
                    let admin = result.formValues[0];
                    if (admin == "" || !admin) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, please specify the player's name you would like to set as an admin.§r" }]}`);
                    } else if (isValidUsername(admin) === false) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, that doesn't look like a valid username.§r" }]}`);
                    } else {
                        let form = new MessageFormData();
                        form.title("Admin settings");
                        form.body(`Are you sure you want to set §b${admin}§r as an admin? §4This will remove all the previous admins.`);
                        form.button1("Yes");
                        form.button2("No");
                        form.show(p).then(async (response) => {
                            if (response.selection === 1) {
                                admins.forEach(async (value) => {
                                    try { await runCmd(overworld, `scoreboard players reset ${value} -au`) } catch (e) { }
                                }); //Quizás intentar añadir alguna forma para poder asignar a varios admins a la vez 
                                try {
                                    await runCmd(overworld, `scoreboard players set "-au${admin}-au" -au 0`);
                                    await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§aAll the previous admins have been deleted, the current admin is: §b${admin}§a.§r" }]}`);
                                } catch (e) {
                                    await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, don't use special characters.§r" }]}`);
                                }
                            }
                        });
                    }
                });
            } break;
            case 2: { //Add an admin 
                let form = new ModalFormData();

                form.title("Admin settings");
                form.textField("Add an admin", "Player's name");
                form.show(p).then(async result => {
                    let admin = result.formValues[0];
                    if (admin == "" || !admin) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, please specify the player's name you would like to add as an admin.§r" }]}`);
                    } else if (isValidUsername(admin) === false) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, that doesn't look like a valid username.§r" }]}`);
                    } else {
                        await runCmd(overworld, `scoreboard players set "-au${admin}-au" -au 0`);
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§aThe player §b${admin}§a has been successfully added as an admin.§r" }]}`);
                    }
                });
            } break;
            case 3: { //Remove an admin 
                let form = new ModalFormData();

                form.title("Admin settings");
                form.textField("Remove an admin", "Player's name");
                form.show(p).then(async result => {
                    let admin = result.formValues[0];
                    if (admin == "" || !admin) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, please specify the admin's name you would like to remove.§r" }]}`);
                    } else if (isValidUsername(admin) === false) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, that doesn't look like a valid username.§r" }]}`);
                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players reset "-au${admin}-au" -au`);
                            await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§aThe admin §b${admin}§a has successfully been removed.§r" }]}`);
                        } catch (e) {
                            await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, couldn't remove the player from the admin list, make sure the player is on the list and try again.§r" }]}`);
                        }
                        //Añadir tryCatch a todos los tellraws de comandos para que si no se ha podido por ejemplo borrar el admin, envíe un mensaje de error 
                    }
                });
            } break;
            case 4: { //Show admins 
                let adminsArray = world.scoreboard.getObjective('-au').getParticipants().map(admin => admin.displayName.match(/(?<=-au)[^]+(?=-au)/)[0]);
                let form = new ModalFormData();
                form.title("Admin settings");
                form.dropdown("Admins list", adminsArray);
                form.show(p);
            } break;
        }
    });
}

function adminCommands(p) {
    const form = new ActionFormData();

    form.title("Admin commands");
    form.body("Select a command");
    form.button("<-- Back");
    form.button("Ban or unban menu");
    form.button("Simulated player");
    form.button("Projectiles tools");
    form.button("Kill a player");
    form.button("Launch a player");
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0: { //Back 
                adminUtilsGui(p);
            } break;
            case 1: { //Ban or unban menu 
                banUnbanMenu(p);
            } break;
            case 2: { //Make a sim player menu 
                simPlayer(p);
            } break;
            case 3: { //Projectiles tools
                projectilePowers(p);
            } break;
            case 4: { //Kill a player 
                let playersArray = players.map(pname => pname.name);
                let locPlayers = players;
                const form = new ActionFormData()
                    .title("Kill a player")
                    .body("Select an online player to kill")
                    .button("<-- Back")
                    .button("Type a player manually instead");
                for (const player of playersArray) {
                    form.button(player, "textures/icons/steve_icon.png");
                }

                form.show(p).then((response) => {
                    if (response.selection === 0) {
                        adminCommands(p);
                    } else if (response.selection === 1) {
                        let form = new ModalFormData()
                            .title("Kill a player")
                            .textField("Type below the player you would like to kill.", "Player's name")
                            .toggle("Force death", true);
                        form.show(p).then(async result => {
                            let playerName = result.formValues[0];
                            if (result.formValues[1] === true) {
                                try {
                                    const query = {
                                        name: playerName
                                    };
                                    let playerEntity = [...world.getPlayers(query)][0];
                                    playerEntity.kill();
                                    await runTellraw(p, `§aThe player §b${playerName}§a has been succesfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            } else if (result.formValues[1] === false) {
                                try {
                                    await runCmd(overworld, `kill ${playerName}`);
                                    await runTellraw(p, `§aThe player §b${playerName}§a has been succesfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            }
                        });
                    } else if (response.selection > 1) {
                        let selectedPlayer = locPlayers[response.selection - 2];

                        let form = new ModalFormData()
                            .title("Kill a player")
                            .toggle("Force death", true);
                        form.show(p).then(async result => {
                            if (result.formValues[0] === true) {
                                try {
                                    selectedPlayer.kill();
                                    await runTellraw(p, `§aThe player §b${selectedPlayer.name}§a has been succesfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            } else if (result.formValues[0] === false) {
                                try {
                                    await runCmd(overworld, `kill ${selectedPlayer.name}`);
                                    await runTellraw(p, `§aThe player §b${selectedPlayer.name}§a has been succesfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            }
                        });
                    }
                });
            } break;
            case 5: { //Launch a player 
                let playersArray = players.map(pname => pname.name);
                const form = new ActionFormData()
                    .title("Launch a player")
                    .body("Select an online player to launch")
                    .button("<-- Back")
                    .button("Type a player manually instead");
                for (const player of playersArray) {
                    form.button(player, "textures/icons/steve_icon.png");
                }

                form.show(p).then((response) => {
                    if (response.selection === 0) {
                        adminCommands(p);
                    } else if (response.selection === 1) {
                        let form = new ModalFormData()
                            .title("Launch a player")
                            .textField("Type below the player you would like to launch", "Player's name");
                        form.show(p).then(async result => {
                            let player = result.formValues[0];

                            if (!isValidUsername(player)) {
                                await runTellraw(p, '§cError, the username you entered is invalid.');
                            } else if (isValidUsername(player)) {
                                try {
                                    await runCmd(overworld, `execute ${player} ~~~ summon fireworks_rocket`);
                                    await runCmd(overworld, `effect ${player} levitation 3 150 true`);
                                    await runCmd(overworld, `execute ${player} ~~~ particle minecraft:cauldron_explosion_emitter`);
                                    await runTellraw(p, `§aThe player §b${player}§a has been launched succesfully.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player §4${player}§c couldn't be launched.`);
                                }
                            }
                        });
                    } else if (response.selection > 1) {
                        let selectedPlayer = playersArray[response.selection - 2];

                        let form = new MessageFormData()
                            .title("Launch a player")
                            .body(`Are you sure you want to launch §b${selectedPlayer}§r?`)
                            .button1("Yes")
                            .button2("No");
                        form.show(p).then(async result => {
                            if (result.selection === 1) {
                                try {
                                    await runCmd(overworld, `execute ${selectedPlayer} ~~~ summon fireworks_rocket`);
                                    await runCmd(overworld, `effect ${selectedPlayer} levitation 3 150 true`);
                                    await runCmd(overworld, `execute ${selectedPlayer} ~~~ particle minecraft:cauldron_explosion_emitter`);
                                    await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been launched succesfully.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player §4${selectedPlayer}§c couldn't be launched.`);
                                }
                            }
                        });
                    }
                });
            } break;
        }
    });
}

function banUnbanMenu(p) {
    const form = new ActionFormData();

    form.title("Ban/unban menu");
    form.body("Select an option");
    form.button("Ban a player");
    form.button("Unban a player");
    form.show(p).then((response) => {
        if (response.selection === 0) {
            banPlayer(p);
        } else if (response.selection === 1) {
            unBanPlayer(p);
        }
    });
}

function banPlayer(p) {
    let playersArray = players.map(pname => pname.name);
    let notBannedPlayers = [];

    const form = new ActionFormData();
    form.title("Ban menu");
    form.body("Select an online player to ban (you cannot ban an admin)");
    form.button("<-- Back");
    form.button("Type a player manually instead");
    for (const player of playersArray) {
        if (isBanned(player) === false && !isAdmin(player)) {
            form.button(player, "textures/icons/steve_icon.png");
            notBannedPlayers.push(player);
        }
    }

    form.show(p).then((response) => {
        if (response.selection === 0) {
            banUnbanMenu(p);
        } else if (response.selection === 1) {
            let form = new ModalFormData();

            form.title("Ban menu");
            form.textField("Type below the player you would like to ban.", "Player's name");
            form.textField("Enter a reason:", "Reason");
            form.show(p).then(async result => {
                let player = result.formValues[0];
                let reason = result.formValues[1];
                let bannedBy = p.name;

                if (isBanned(player)) {
                    await runTellraw(p, `§cError, the specified player is already banned.`);

                } else if (isAdmin(player)) {
                    await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                } else if (!isValidUsername(player)) {
                    await runTellraw(p, `§cError, the username you entered is invalid.`);

                } else {
                    try {
                        await runCmd(overworld, `scoreboard players set "${player}-aureason${reason}-auban${bannedBy}" -auban 0`);
                        try { await runCmd(overworld, `kick "${player}" "\n§l§6------------------------------------------------------\n§l§4§k|||||§r§l§cYou have been banned by §4${bannedBy}§c.§4§k|||||§r\n§l§4Reason: §c${reason}\n§r§l§6------------------------------------------------------§r"`) } catch (e) { }
                        await runTellraw(p, `§aThe player §b${player}§a has been banned successfully with reason: §c${reason}§a.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't ban the player.`);
                    }
                }
            });
        } else if (response.selection > 1) {
            let selectedPlayer = notBannedPlayers[response.selection - 2];

            let form = new ModalFormData();
            form.title("Ban menu");
            form.textField("Enter a reason:", "Reason");
            form.show(p).then(async result => {
                let reason = result.formValues[0];
                let bannedBy = p.name;
                try {
                    await runCmd(overworld, `scoreboard players set "${selectedPlayer}-aureason${reason}-auban${bannedBy}" -auban 0`);
                    try { await runCmd(overworld, `kick "${selectedPlayer}" "\n§l§6------------------------------------------------------\n§l§4§k|||||§r§l§cYou have been banned by §4${bannedBy}§c.§4§k|||||§r\n§l§4Reason: §c${reason}\n§r§l§6------------------------------------------------------§r"`) } catch (e) { }
                    await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been banned successfully with reason: §c${reason}§a.`);
                } catch (e) {
                    await runTellraw(p, `§cError, couldn't ban the player.`);
                }
            });
        }
    });
}

function unBanPlayer(p) {
    let bannedPlayers = [];

    const form = new ActionFormData();
    form.title("Unban menu");
    form.body("Select a player to unban");
    form.button("<-- Back");
    form.button("Type a player manually instead");
    for (const bannedPlayer of world.scoreboard.getObjective('-auban').getParticipants().map(participant => participant.displayName)) {
        bannedPlayers.push(bannedPlayer.match(/[^-]+/)[0]);
    }

    for (const player of bannedPlayers) {
        if (isBanned(player) === true && !isAdmin(player)) {
            form.button(player, "textures/icons/steve_icon.png");
        }
    }

    form.show(p).then((response) => {
        if (response.selection === 0) {
            banUnbanMenu(p);
        } else if (response.selection === 1) {
            let form = new ModalFormData();

            form.title("Unban menu");
            form.textField("Type below the player you would like to unban.", "Player's name");
            form.show(p).then(async result => {
                let player = result.formValues[0];
                let reason = getBanReason(player);
                let bannedBy = getBannedBy(player);

                if (!isBanned(player)) {
                    await runTellraw(p, `§cError, the specified player is not banned.`);

                } else if (!isValidUsername(player)) {
                    await runTellraw(p, `§cError, the username you entered is invalid.`);

                } else if (isBanned(player) === true && isValidUsername(player)) {
                    try {
                        await runCmd(overworld, `scoreboard players reset "${player}-aureason${reason}-auban${bannedBy}" -auban`);
                        await runTellraw(p, `§aThe player §b${player}§a has been unbanned successfully.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't unban the player.`);
                    }
                }
            });
        } else if (response.selection > 1) {
            let selectedPlayer = bannedPlayers[response.selection - 2];

            let form = new MessageFormData();
            form.title("Unban menu");
            form.body(`Are you sure you want to unban §b${selectedPlayer}§r?`);
            form.button1("Yes");
            form.button2("No");
            form.show(p).then(async result => {
                if (result.selection === 1) {
                    let reason = getBanReason(selectedPlayer);
                    let bannedBy = getBannedBy(selectedPlayer);
                    try {
                        await runCmd(overworld, `scoreboard players reset "${selectedPlayer}-aureason${reason}-auban${bannedBy}" -auban`);
                        await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been unbanned successfully.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't unban the player.`);
                    }
                }
            });
        }
    });
}

function projectilePowers(p) {
    const form = new ActionFormData()
        .title("Projectiles tools")
        .body("Select an option")
        .button("<-- Back")
        .button("Snowball tools")
        .button("Arrow tools");
    form.show(p).then((response) => {
        if (response.selection === 0) {
            adminCommands(p);
        } else if (response.selection === 1) {
            snowballTools();
            function snowballTools() {
                const form = new ActionFormData()
                    .title("Snowball tools")
                    .body("Select an option")
                    .button("<-- Back")
                    .button("Lightning bolt");
                form.show(p).then((response) => {
                    if (response.selection === 0) {
                        projectilePowers(p);
                    } else if (response.selection === 1) {
                        lightningBolt();
                        function lightningBolt() {
                            const form = new ActionFormData()
                                .title("Lightning bolt")
                                .body("Select an option")
                                .button("<-- Back")
                                .button("Enable for a player")
                                .button("Disable for a player");
                            form.show(p).then((response) => {
                                if (response.selection === 0) {
                                    snowballTools();
                                } else if (response.selection === 1) {
                                    let playersArray = players.map(pname => pname.name).filter(pname => !isLightningBoltEnabled(pname)); //Get disabled players
                                    const form = new ActionFormData()
                                        .title("Enable for a player")
                                        .body("Select an online player to enable lightning bolt summoning when throwing a snowball at an entity.")
                                        .button("<-- Back")
                                        .button("Type a player manually instead");
                                    for (const player of playersArray) {
                                        form.button(player, "textures/icons/steve_icon.png");
                                    }

                                    form.show(p).then((response) => {
                                        if (response.selection === 0) {
                                            lightningBolt();
                                        } else if (response.selection === 1) {
                                            let form = new ModalFormData()
                                                .title("Enable for a player")
                                                .textField("Type below the player you would like to enable lightning bolt summoning.", "Player's name");
                                            form.show(p).then(async result => {
                                                let player = result.formValues[0];

                                                if (isLightningBoltEnabled(player)) {
                                                    await runTellraw(p, "§cError, the specified player is already enabled.");

                                                } else if (!isValidUsername(player)) {
                                                    await runTellraw(p, "§Error, the username you entered is invalid.");

                                                } else {
                                                    try {
                                                        await runCmd(overworld, `scoreboard players set "-au${player}-au" snowProj 0`);
                                                        await runTellraw(p, `§aLightning bolt summoning has been enabled for §b${player}§a successfully.`);
                                                    } catch (e) {
                                                        await runTellraw(p, "§cError, couldn't enable lightning bolt summoning for the selected player.");
                                                    }
                                                }
                                            });
                                        } else if (response.selection > 1) {
                                            let selectedPlayer = playersArray[response.selection - 2]
                                            let form = new MessageFormData()
                                                .title("Enable for a player")
                                                .body(`Are you sure you want to enable lightning bolt summoning when throwing a snowball for §b${selectedPlayer}§r?`)
                                                .button1("Yes")
                                                .button2("No");
                                            form.show(p).then(async result => {
                                                if (result.selection === 1) {
                                                    try {
                                                        await runCmd(overworld, `scoreboard players set "-au${selectedPlayer}-au" snowProj 0`);
                                                        await runTellraw(p, `§aLightning bolt summoning has been enabled for §b${selectedPlayer}§a successfully.`);
                                                    } catch (e) {
                                                        await runTellraw(p, "§cError, couldn't enable lightning bolt summoning for the selected player.");
                                                    }
                                                }
                                            });
                                        }
                                    });
                                } else if (response.selection === 2) {

                                }
                            });
                        }
                    }
                });
            }
        } else if (response.selection === 2) {
            function arrowTools() {

            }
        }
    });

    const formA = new ActionFormData()
        .title("Projectile powers")
        .body("Select the power you would like to use.")
        .button("<-- Back")
        .button("Lightning bolt summoning");
    formA.show(p).then((response) => {
        if (response.selection === 0) {
            adminCommands(p);
        } else if (response.selection === 1) {
            lightningBolt();
            function lightningBolt() {
                const form = new ActionFormData()
                    .title("Lightning bolt summoning")
                    .body("Select an option")
                    .button("<-- Back")
                    .button("Enable for a player")
                    .button("Disable for a player");
                form.show(p).then((response) => {
                    if (response.selection === 0) {
                        projectilePowers(p);
                    } else if (response.selection === 1) {
                        let playersArray = players.map(pname => pname.name); //Get disabled players
                        const form = new ActionFormData()
                            .title("Enable for a player")
                            .body("Select an online player to enable lightning bolt summoning when shooting a projectile at an entity.\nYou will be able to select the projectiles later.")
                            .button("<-- Back")
                            .button("Type a player manually instead");
                        for (const player of playersArray) {
                            form.button(player, "textures/icons/steve_icon.png");
                        }

                        form.show(p).then((response) => {
                            if (response.selection === 0) {
                                lightningBolt();
                            } else if (response.selection === 1) {
                                let form = new ModalFormData()
                                    .title("Enable for a player")
                                    .textField("Type below the player you would like to enable lightning bolt summoning.", "Player's name")
                                    .toggle("Snowball", )
                                    .toggle("Arrow", false);
                                form.show(p).then(async result => {
                                    let player = result.formValues[0];
                                    let snowball = result.formValues[1];
                                    let arrow = result.formValues[2];

                                    if (!isValidUsername(player)) {
                                        await runTellraw(p, "§Error, the username you entered is invalid.");

                                    } else {
                                        if (snowball === true) {
                                            try {
                                                await runCmd(overworld, `scoreboard players set "-au${player}-au" snowProj 0`);
                                                await runTellraw(p, `§aLightning bolt summoning with §bsnowball§a has been enabled for §b${player}§a successfully.`);
                                            } catch (e) {
                                                await runTellraw(p, "§cError, couldn't enable lightning bolt summoning with §4snowball§c for the selected player, perhaps it's already enabled.");
                                            }
                                        } else {

                                        }
                                        if (arrow === true) {
                                            try {
                                                await runCmd(overworld, `scoreboard players set "-au${player}-au" arrowProj 0`);
                                                await runTellraw(p, `§aLightning bolt summoning with §barrow§a has been enabled for §b${player}§a successfully.`);
                                            } catch (e) {
                                                await runTellraw(p, "§cError, couldn't enable lightning bolt summoning with §4arrow§cfor the selected player, perhaps it's already enabled.");
                                            }
                                        } else {

                                        }
                                    }
                                });
                            } else if (response.selection > 1) {
                                let selectedPlayer = playersArray[response.selection - 2]
                                let form = new ModalFormData()
                                    .title("Enable for a player")
                                    .toggle("Snowball", false)
                                    .toggle("Arrow", false);
                                form.show(p).then(async (response) => {
                                    let snowball = response.formValues[0];
                                    let arrow = response.formValues[1];

                                    if (snowball === true) {
                                        try {
                                            await runCmd(overworld, `scoreboard players set "-au${selectedPlayer}-au" snowProj 0`);
                                            await runTellraw(p, `§aLightning bolt summoning with §bsnowball§a has been enabled for §b${selectedPlayer}§a successfully.`);
                                        } catch (e) {
                                            await runTellraw(p, "§cError, couldn't enable lightning bolt summoning with §4snowball§c for the selected player, perhaps it's already enabled.");
                                        }
                                    } else if (arrow === true) {

                                    }
                                });
                            }
                        });
                    } else if (response.selection === 2) {

                    }
                });
            }
        }
    });
}

function simPlayer(p) {
    const form = new ActionFormData()
        .title("Create a simulated player")
        .body("What would you like the simulated player to do?")
        .button("Attack and follow a player")
        .button("Follow a player")
        .button("Idle")
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0: { //Attack and follow a player 
                let playersArray = players.map(pname => pname.name);
                let locPlayers = players;
                const form = new ActionFormData()
                    .title("Attack and follow a player")
                    .body("Select an online player to attack and follow")
                    .button("<-- Back")
                    .button("Type a player manually instead");
                for (const player of playersArray) {
                    form.button(player, "textures/icons/steve_icon.png");
                }

                form.show(p).then((response) => {
                    if (response.selection === 0) {
                        simPlayer(p);
                    } else if (response.selection === 1) {
                        let form = new ModalFormData()
                            .title("Attack and follow a player")
                            .textField("Type below the victim's name", "Online player's name")
                            .textField("Type below the name of the simulated player", "Simulated player's name")
                            .slider("Time in seconds the simulated player should attack", 2, 600, 1, 15);

                        form.show(p).then(async result => {
                            let victim = result.formValues[0];
                            const query = {
                                name: victim
                            };
                            let victimEntity = [...world.getPlayers(query)][0];

                            let simName = result.formValues[1];
                            let timeInTicks = result.formValues[2] * 20;
                            let offset = 0;
                            let summoned = false;

                            if (isValidUsername(victim)) {
                                try {
                                    await runCmd(overworld, `testfor ${victimEntity.name}`);
                                    GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                        const spawnLoc = new BlockLocation(1, 2, 1);
                                        const player = test.spawnSimulatedPlayer(spawnLoc, simName);
                                        player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                        player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                        player.addEffect(MinecraftEffectTypes.strength, 99999, 2, false);
                                        player.setGameMode(GameMode.creative);
                                        player.addTag("simPlayer");

                                        test
                                            .startSequence()
                                            .thenExecuteFor(timeInTicks, async () => {
                                                player.lookAtEntity(victimEntity);
                                                player.navigateToEntity(victimEntity);
                                                player.attackEntity(victimEntity);
                                                try {
                                                    await runCmd(player, `testfor @a[name=${victimEntity.name}, r=10]`);
                                                } catch (e) {
                                                    try { await runCmd(player, `tp @s ${victimEntity.name}`) } catch (e) { }
                                                }
                                            })
                                    })
                                        .maxTicks(timeInTicks)
                                        .setupTicks(0)
                                        .structureName("SimFolder:simtest")
                                        .tag(GameTest.Tags.suiteDefault);
                                    while (!summoned) {
                                        try {
                                            await runCmd(p, `testfor @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=9]`);
                                            offset = offset + 10;
                                        } catch (e) {
                                            await runCmd(p, `execute @s ~${offset} ~ ~ fill ~4 317 ~-4 ~-4 317 ~4 glass`);
                                            await runCmd(p, `execute @s ~${offset} 318 ~ gametest run simtest:sim_test${simtest} false 1`);
                                            await runCmd(p, `summon au:basedetect ~${offset} 318 ~`);
                                            await runCmd(p, `tag @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=1, c=1] add simNotSpawned`);
                                            summoned = true;
                                        }
                                    }
                                    simtest++;
                                } catch (e) {
                                    await runTellraw(p, '§cError, the player you entered is not online.')
                                }
                            } else {
                                await runTellraw(p, '§cError, the username you entered is invalid.');
                            }
                        });
                    } else if (response.selection > 1) {
                        //El array no sirve en el mundo si cambian los jugadores (solucionado) 
                        let form = new ModalFormData()
                            .title("Attack and follow a player")
                            .textField("Type below the name of the simulated player", "Simulated player's name")
                            .slider("Time in seconds the simulated player should attack", 2, 600, 1, 15);
                        form.show(p).then(async result => {
                            let simName = result.formValues[0];
                            let timeInTicks = result.formValues[1] * 20;
                            let selectedPlayerRaw = locPlayers[response.selection - 2];
                            let offset = 0;
                            let summoned = false;

                            try {
                                await runCmd(p, `testfor ${selectedPlayerRaw.name}`);
                                GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                    const spawnLoc = new BlockLocation(1, 2, 1);
                                    const player = test.spawnSimulatedPlayer(spawnLoc, simName);
                                    player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                    player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                    player.addEffect(MinecraftEffectTypes.strength, 99999, 2, false);
                                    player.setGameMode(GameMode.creative);
                                    player.addTag("simPlayer");

                                    test
                                        .startSequence()
                                        .thenExecuteFor(timeInTicks, async () => {
                                            player.lookAtEntity(selectedPlayerRaw);
                                            player.navigateToEntity(selectedPlayerRaw);
                                            player.attackEntity(selectedPlayerRaw);
                                            try {
                                                await runCmd(player, `testfor @a[name=${selectedPlayerRaw.name}, r=10]`);
                                            } catch (e) {
                                                try { await runCmd(player, `tp @s ${selectedPlayerRaw.name}`) } catch (e) { }
                                            }
                                        })
                                })
                                    .maxTicks(timeInTicks)
                                    .setupTicks(0)
                                    .structureName("SimFolder:simtest")
                                    .tag(GameTest.Tags.suiteDefault);
                                while (!summoned) {
                                    try {
                                        await runCmd(p, `testfor @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=9]`);
                                        offset = offset + 10;
                                    } catch (e) {
                                        await runCmd(p, `execute @s ~${offset} ~ ~ fill ~4 317 ~-4 ~-4 317 ~4 glass`);
                                        await runCmd(p, `execute @s ~${offset} 318 ~ gametest run simtest:sim_test${simtest} false 1`);
                                        await runCmd(p, `summon au:basedetect ~${offset} 318 ~`);
                                        await runCmd(p, `tag @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=1, c=1] add simNotSpawned`);
                                        summoned = true;
                                    }
                                }
                                simtest++;
                            } catch (e) {
                                await runTellraw(p, '§cError, the player you selected is now offline.');
                            }
                        });
                    }
                });
            } break;
            case 1: { //Follow a player 
                let playersArray = players.map(pname => pname.name);
                let locPlayers = players;
                const form = new ActionFormData()
                    .title("Follow a player")
                    .body("Select an online player to follow")
                    .button("<-- Back")
                    .button("Type a player manually instead");
                for (const player of playersArray) {
                    form.button(player, "textures/icons/steve_icon.png");
                }

                form.show(p).then((response) => {
                    if (response.selection === 0) {
                        simPlayer(p);
                    } else if (response.selection === 1) {
                        let form = new ModalFormData()
                            .title("Follow a player")
                            .textField("Type below the target's name", "Online player's name")
                            .textField("Type below the name of the simulated player", "Simulated player's name")
                            .slider("Time in seconds the simulated player should follow the target", 2, 600, 1, 15);

                        form.show(p).then(async result => {
                            let victim = result.formValues[0];
                            const query = {
                                name: victim
                            };
                            let victimEntity = [...world.getPlayers(query)][0];

                            let simName = result.formValues[1];
                            let timeInTicks = result.formValues[2] * 20;
                            let offset = 0;
                            let summoned = false;

                            if (isValidUsername(victim)) {
                                try {
                                    await runCmd(overworld, `testfor ${victimEntity.name}`);
                                    GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                        const spawnLoc = new BlockLocation(1, 2, 1);
                                        const player = test.spawnSimulatedPlayer(spawnLoc, simName);
                                        player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                        player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                        player.setGameMode(GameMode.creative);
                                        player.addTag("simPlayer");

                                        test
                                            .startSequence()
                                            .thenExecuteFor(timeInTicks, async () => {
                                                player.lookAtEntity(victimEntity);
                                                player.navigateToEntity(victimEntity);
                                                try {
                                                    await runCmd(player, `testfor @a[name=${victimEntity.name}, r=10]`);
                                                } catch (e) {
                                                    try { await runCmd(player, `tp @s ${victimEntity.name}`) } catch (e) { }
                                                }
                                            })
                                    })
                                        .maxTicks(timeInTicks)
                                        .setupTicks(0)
                                        .structureName("SimFolder:simtest")
                                        .tag(GameTest.Tags.suiteDefault);
                                    while (!summoned) {
                                        try {
                                            await runCmd(p, `testfor @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=9]`);
                                            offset = offset + 10;
                                        } catch (e) {
                                            await runCmd(p, `execute @s ~${offset} ~ ~ fill ~4 317 ~-4 ~-4 317 ~4 glass`);
                                            await runCmd(p, `execute @s ~${offset} 318 ~ gametest run simtest:sim_test${simtest} false 1`);
                                            await runCmd(p, `summon au:basedetect ~${offset} 318 ~`);
                                            await runCmd(p, `tag @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=1, c=1] add simNotSpawned`);
                                            summoned = true;
                                        }
                                    }
                                    simtest++;
                                } catch (e) {
                                    await runTellraw(p, '§cError, the player you entered is not online.')
                                }
                            } else {
                                await runTellraw(p, '§cError, the username you entered is invalid.');
                            }
                        });
                    } else if (response.selection > 1) {
                        let form = new ModalFormData()
                            .title("Follow a player")
                            .textField("Type below the name of the simulated player", "Simulated player's name")
                            .slider("Time in seconds the simulated player should follow the target", 2, 600, 1, 15);

                        form.show(p).then(async result => {
                            let simName = result.formValues[0];
                            let timeInTicks = result.formValues[1] * 20;
                            let selectedPlayerRaw = locPlayers[response.selection - 2];
                            let offset = 0;
                            let summoned = false;

                            try {
                                await runCmd(p, `testfor ${selectedPlayerRaw.name}`);
                                GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                    const spawnLoc = new BlockLocation(1, 2, 1);
                                    const player = test.spawnSimulatedPlayer(spawnLoc, simName);
                                    player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                    player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                    player.setGameMode(GameMode.creative);
                                    player.addTag("simPlayer");

                                    test
                                        .startSequence()
                                        .thenExecuteFor(timeInTicks, async () => {
                                            player.lookAtEntity(selectedPlayerRaw);
                                            player.navigateToEntity(selectedPlayerRaw);
                                            try {
                                                await runCmd(player, `testfor @a[name=${selectedPlayerRaw.name}, r=10]`);
                                            } catch (e) {
                                                try { await runCmd(player, `tp @s ${selectedPlayerRaw.name}`) } catch (e) { }
                                            }
                                        })
                                })
                                    .maxTicks(timeInTicks)
                                    .setupTicks(0)
                                    .structureName("SimFolder:simtest")
                                    .tag(GameTest.Tags.suiteDefault);
                                while (!summoned) {
                                    try {
                                        await runCmd(p, `testfor @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=9]`);
                                        offset = offset + 10;
                                    } catch (e) {
                                        await runCmd(p, `execute @s ~${offset} ~ ~ fill ~4 317 ~-4 ~-4 317 ~4 glass`);
                                        await runCmd(p, `execute @s ~${offset} 318 ~ gametest run simtest:sim_test${simtest} false 1`);
                                        await runCmd(p, `summon au:basedetect ~${offset} 318 ~`);
                                        await runCmd(p, `tag @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=1, c=1] add simNotSpawned`);
                                        summoned = true;
                                    }
                                }
                                simtest++;
                            } catch (e) {
                                await runTellraw(p, '§cError, the player you selected is now offline.');
                            }
                        });
                    }
                });
            } break;
            case 2: { //Idle 
                let form = new ModalFormData()
                    .title("Idle")
                    .textField("Type below the name of the simulated player", "Simulated player's name")
                    .slider("Time in seconds the simulated player should follow the target", 2, 600, 1, 15)
                    .toggle("Look at close players", true);

                form.show(p).then(async result => {
                    if (result.canceled === false) {
                        let simName = result.formValues[0];
                        let timeInTicks = result.formValues[1] * 20;
                        let lookClosePlayer = result.formValues[2];
                        let offset = 0;
                        let summoned = false;
                        let tpped = false;

                        GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                            const spawnLoc = new BlockLocation(1, 2, 1);
                            const player = test.spawnSimulatedPlayer(spawnLoc, simName);
                            player.setGameMode(GameMode.creative);
                            player.addTag("simPlayer");

                            test
                                .startSequence()
                                .thenExecuteFor(timeInTicks, async () => {
                                    if (lookClosePlayer === true) {
                                        let closestP = [];
                                        let playerLoc = new Location(player.location.x, player.location.y, player.location.z);
                                        const query = {
                                            closest: 1,
                                            maxDistance: 15,
                                            excludeNames: [player.name],
                                            location: playerLoc
                                        };
                                        try { closestP = [...overworld.getPlayers(query)][0] } catch (e) { }
                                        try { player.lookAtEntity(closestP) } catch (e) { }
                                    }
                                    if (!tpped) {
                                        try {
                                            await runCmd(player, `tp ${p.name}`);
                                            tpped = true;
                                        } catch (e) { }
                                    }
                                })
                        })
                            .maxTicks(timeInTicks)
                            .setupTicks(0)
                            .structureName("SimFolder:simtest")
                            .tag(GameTest.Tags.suiteDefault);
                        while (!summoned) {
                            try {
                                await runCmd(p, `testfor @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=9]`);
                                offset = offset + 10;
                            } catch (e) {
                                await runCmd(p, `execute @s ~${offset} ~ ~ fill ~4 317 ~-4 ~-4 317 ~4 glass`);
                                await runCmd(p, `execute @s ~${offset} 318 ~ gametest run simtest:sim_test${simtest} false 1`);
                                await runCmd(p, `summon au:basedetect ~${offset} 318 ~`);
                                await runCmd(p, `tag @e[type=au:basedetect, x=~${offset}, y=318, z=~, r=1, c=1] add simNotSpawned`);
                                summoned = true;
                            }
                        }
                        simtest++;
                    }
                });
            }
        }
    });
}

function runCmd(obj, cmd) {
    return obj.runCommandAsync(cmd);
}

function runTellraw(player, txt) {
    return player.runCommandAsync(`execute @s ~~~ tellraw @s {"rawtext": [{ "text": "${txt}" }]}`);
}

function isValidUsername(username) {
    if (username.match(/^ | $/) !== null || username.match(/[^A-Za-z0-9À-ÿ\u00f1\u00d1 ]+/) !== null) {
        return false;
    } else if (username.match(/^ | $/) === null && username.match(/[^A-Za-z0-9À-ÿ\u00f1\u00d1 ]+/) === null) {
        return true;
    }
}

function isAdmin(username) {
    if (admins.includes(`-au${username}-au`)) return true
    else return false;
}

function isBanned(player) {
    let bannedPlayers = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auban').getParticipants()) {
        bannedPlayers.push(bannedRawPlayer.displayName.match(/[^]+(?=-aureason)/)[0]);
    }
    if (bannedPlayers.includes(player)) return true
    else return false;
}

function getBanReason(player) {
    let bannedPlayers = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auban').getParticipants()) {
        bannedPlayers.push(bannedRawPlayer.displayName.match(/[^]+(?=-aureason)/)[0]);
    }

    let banReasons = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auban').getParticipants()) {
        banReasons.push(bannedRawPlayer.displayName.match(/(?<=-aureason)[^]+(?=-auban)/)[0]);
    }
    return banReasons[bannedPlayers.indexOf(player)];
}

function getBannedBy(player) {
    let bannedPlayers = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auban').getParticipants()) {
        bannedPlayers.push(bannedRawPlayer.displayName.match(/[^]+(?=-aureason)/)[0]);
    }

    let bannedBys = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auban').getParticipants()) {
        bannedBys.push(bannedRawPlayer.displayName.match(/(?<=-auban)[^]+/)[0]);
    }
    return bannedBys[bannedPlayers.indexOf(player)];
}

function isLightningBoltEnabled(pname) {
    let snowProj = [];
    try { snowProj = [...world.scoreboard.getObjective('snowProj').getParticipants().map(participant => participant.displayName)] } catch (e) { } //Get participants for snowProj
    if (snowProj.includes(`-au${pname}-au`)) return true
    else return false;
}

function isPowerEnabled(pname, projectile, power) {
    let projScoreboard = [];
    try { projScoreboard = [...world.scoreboard.getObjective('-auProj').getParticipants().map(participant => participant.displayName)]} catch (e) { }
    let result = projScoreboard.filter(participant => { //-auMisledPaul58976-au+snowon-bolton+arrowoff-boltoff
        let regex = new RegExp(`(?<=-au${pname}-au.*\+${projectile}on.*-${power})(on)(?=.*\+${projectile}.*\+)`);
        let filter = participant.match(regex)[0];
    });
    //Seguir investigando el match para el -snowon-boltoff
}
/* const pname = "MisledPaul58976";
   const xd = "-auMisledPaul58976-au+snowon-bolton+arrowoff-boltoff";
   const projectile = "snow";
   const power = "bolt";
   const regex = new RegExp(`(?<=-au${pname}-au.*\+${projectile}on.*-${power})on(?=.*\+${projectile}.*\+)`);

   console.log(xd.match(regex)[1]);
*/