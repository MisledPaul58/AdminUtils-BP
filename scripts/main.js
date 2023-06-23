import { world, MinecraftEffectTypes, GameMode, system, Vector } from "@minecraft/server";
import * as GameTest from "@minecraft/server-gametest";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import moment from "./moment/src/moment.js";

const overworld = world.getDimension("overworld"); //Hacer una cárcel con tiempo y un vanish
let firstPlayer = false;
let players = [];
let admins = [];
let simtest = 0;
let tntFlag = "-autnt0";

system.events.beforeWatchdogTerminate.subscribe(watchdog => {
    watchdog.cancel = true;
});

system.runInterval(async tick => {
    let { currentTick } = system;
    players = [...world.getPlayers()];

    try { admins = [...world.scoreboard.getObjective('-au').getParticipants().map(admin => admin.displayName)] } catch (e) { }
    if (players.length === 1 && firstPlayer === false) {
        try { await runCmd(overworld, 'scoreboard objectives add -au dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auban dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auProj dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -aufrozen dummy') } catch (e) { }
        if (currentTick % 200 === 0) {
            await runCmd(overworld, `execute @a ~~~ tellraw @s {"rawtext":[{"text":"§l§4§kqww§r§l§bThanks for using Admin Utils! §aMade by §6MisledPaul58§4§kqww§r"}]}`);
            firstPlayer = true;
        }
    }

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
        if (isFrozen(player.name)) { //Hacer que se pueda congelar a jugadores que no estén conectados
            try {
                const positions = world.scoreboard.getObjective('-aufrozen').getParticipants().filter(participant => participant.displayName.match(/-auname([^]*) -au-?[0-9]+[^]* -au-?[0-9]+[^]* -au-?[0-9]+[^]*/)[1] === player.name)[0].displayName.match(/-au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*)/).slice(1).map(pos => pos * 1); //Gets the positions where the player was frozen and converts it to integer or float
                player.teleport(new Vector(positions[0], positions[1], positions[2]), player.dimension, player.getRotation().x, player.getRotation().y);
                //positions[0] is the x, positions[1] the y and positions[2] the z
            } catch (e) {
                const scoreboard = world.scoreboard.getObjective('-aufrozen').getParticipants().filter(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1] === player.name)[0].displayName;
                await runCmd(player.dimension, `scoreboard players reset "${scoreboard}" -aufrozen`);
                await runCmd(player.dimension, `scoreboard players set "-auname${player.name} -au${player.location.x} -au${player.location.y} -au${player.location.z}" -aufrozen 0`);
            }
        }
    }

    for (const bannedPlayer of getBannedPlayers().filter(player => !isPermaBanned(player))) {
        if (isBanTimeOver(bannedPlayer)) {
            const reason = getBanReason(bannedPlayer);
            const bannedBy = getBannedBy(bannedPlayer);
            const banISO = getUnBanISO(bannedPlayer);
            await runCmd(overworld, `scoreboard players reset "${bannedPlayer}-aureason${reason}-auban${bannedBy}-autime${banISO}" -auban`);
        }
    }
}, 1);

world.afterEvents.playerJoin.subscribe(async event => {
    const { playerName } = event;
    if (isBanned(playerName)) {
        const reason = getBanReason(playerName);
        const bannedBy = getBannedBy(playerName);
        if (isPermaBanned(playerName)) {
            testfor();
            async function testfor() {
                const delay = ticks => new Promise(res => system.runTimeout(res, ticks));

                while (function () { //Waits until the banned player actually joins
                    const { successCount } = overworld.runCommand(`testfor "${playerName}"`);
                    if (successCount === 1) return false
                    else return true;
                }()) {
                    await delay(1);
                }

                overworld.runCommand(`kick "${playerName}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou were permanently banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§r§l§6----------------------------§r"`);
            }
        } else {
            const unBanDate = moment(getUnBanISO(playerName), moment.ISO_8601);
            const currentDate = moment();
            const remainingTime = moment.duration(unBanDate.diff(currentDate));

            const remainingYears = remainingTime.years();
            const remainingMonths = remainingTime.months();
            const remainingWeeks = remainingTime.weeks();
            remainingTime.subtract(remainingWeeks * 7, 'days');
            const remainingDays = remainingTime.days();
            const remainingHours = remainingTime.hours();
            const remainingMinutes = remainingTime.minutes();
            const remainingSeconds = remainingTime.seconds();
            /*
            while (testfor => { //Waits until the banned player actually joins
                let successCount;
                try {
                    successCount = overworld.runCommand(`testfor "${playerName}"`).successCount;
                } catch (e) { }
                if (successCount === 1) return false
                else return true;
            }) { }
            system.run(() => {
                overworld.runCommand(`kick "${playerName}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou were banned by §4${bannedBy}§4§k|||||§r\n§l§4Reason: §c${reason}\n§l§4Remaining time: §c${remainingYears} ${remainingYears == 1 ? "year" : "years"} ${remainingMonths} ${remainingMonths == 1 ? "month" : "months"} ${remainingWeeks} ${remainingWeeks == 1 ? "week" : "weeks"} ${remainingDays} ${remainingDays == 1 ? "day" : "days"} ${remainingHours} ${remainingHours == 1 ? "hour" : "hours"} ${remainingMinutes} ${remainingMinutes == 1 ? "minute" : "minutes"} ${remainingSeconds} ${remainingSeconds == 1 ? "second" : "seconds"}\n§r§l§6----------------------------§r"`);
            });
            */
            testfor();
            async function testfor() {
                const delay = ticks => new Promise(res => system.runTimeout(res, ticks));

                while (function () { //Waits until the banned player actually joins
                    const { successCount } = overworld.runCommand(`testfor "${playerName}"`);
                    if (successCount === 1) return false
                    else return true;
                }()) {
                    await delay(10);
                }

                await delay(4);
                const years = remainingYears === 0 ? "" : remainingYears === 1 ? `${remainingYears} year ` : `${remainingYears} years `;
                const months = remainingMonths === 0 ? "" : remainingMonths === 1 ? `${remainingMonths} month ` : `${remainingMonths} months `;
                const weeks = remainingWeeks === 0 ? "" : remainingWeeks === 1 ? `${remainingWeeks} week ` : `${remainingWeeks} weeks `;
                const days = remainingDays === 0 ? "" : remainingDays === 1 ? `${remainingDays} day ` : `${remainingDays} days `;
                const hours = remainingHours === 0 ? "" : remainingHours === 1 ? `${remainingHours} hour ` : `${remainingHours} hours `;
                const minutes = remainingMinutes === 0 ? "" : remainingMinutes === 1 ? `${remainingMinutes} minute ` : `${remainingMinutes} minutes `;
                const seconds = remainingSeconds === 0 ? "" : remainingSeconds === 1 ? `${remainingSeconds} second` : `${remainingSeconds} seconds`;

                overworld.runCommand(`kick "${playerName}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou were temporarily banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§4Remaining time: §c${years}${months}${weeks}${days}${hours}${minutes}${seconds}\n§r§l§6----------------------------§r"`);
            }
        }
    }
});

world.beforeEvents.itemUse.subscribe(data => {
    const player = data.source;
    if (data.itemStack.typeId === "minecraft:stick" && isAdmin(player.name)) {
        /*const query = {
            maxDistance: 10
        };
        const entities = player.getEntitiesFromViewDirection(query);
        player.runCommand(`say ${entities.map(entity => entity.typeId)}`);
        player.applyKnockback(player.getViewDirection().x, player.getViewDirection().z, 1, 1);
        */
        system.run(() => {
            adminUtilsGui(player);
        });
    }
});

world.afterEvents.projectileHit.subscribe(event => {
    const { dimension, projectile, source } = event;
    const HitEntity = event.getEntityHit().entity;
    if (source.typeId === "minecraft:player" && HitEntity.typeId !== "minecraft:tnt") {
        RunProjectilePowers();
        async function RunProjectilePowers() {
            const proj = projectile.typeId.replace(/minecraft:/, '');
            if (isPowerEnabled(source.nameTag, proj, "bolt")) {
                await runCmd(dimension, `summon lightning_bolt ${HitEntity.location.x} ${HitEntity.location.y} ${HitEntity.location.z}`);
            }
            if (isPowerEnabled(source.nameTag, proj, "freeze")) { //Centrarlos, quitando los decimales y sustituyendolos por ".5", o quitando los decimales y sumando 1 (minecraft resta 0.5 a los números sin decimales para encajar en el centro del bloque), con Math floor es mejor (listo)
                const entityLoc = HitEntity.location;
                await runCmd(HitEntity, `tp ${Math.floor(entityLoc.x)} ${Math.floor(entityLoc.y)} ${Math.floor(entityLoc.z)}`);
                await runCmd(dimension, `fill ${entityLoc.x - 1} ${entityLoc.y - 1} ${entityLoc.z - 1} ${entityLoc.x + 1} ${entityLoc.y + 2} ${entityLoc.z + 1} ice [] replace air`);
                await runCmd(dimension, `playsound random.glass @a ${entityLoc.x} ${entityLoc.y} ${entityLoc.z} 100`);
            }
            if (isPowerEnabled(source.nameTag, proj, "tnt")) {
                try {
                    await runCmd(HitEntity, `summon tnt`);
                    const query = {
                        closest: 1,
                        type: "tnt",
                        excludeTags: ["-autnt"],
                        location: HitEntity.location
                    };
                    const tnt = [...HitEntity.dimension.getEntities(query)][0];
                    const _tntFlag = tntFlag;
                    tnt.addTag(_tntFlag);
                    tnt.addTag("-autnt");
                    tntFlag = `-autnt${tntFlag.match(/[0-9]+/)[0] * 1 + 1}`; //Va sumando 1 cada vez
                    asyncTntTp();
                    async function asyncTntTp() {
                        while (function () {
                            const { successCount } = tnt.dimension.runCommand(`testfor @e[type=tnt, tag=${_tntFlag}]`);
                            if (successCount === 0) return false
                            else return true;
                        }()) {
                            await runCmd(HitEntity, `tp @e[type=tnt, tag="${_tntFlag}"] @s`);
                        }
                    }
                } catch (e) { }
            }
        }
    }
});

function adminUtilsGui(p) {
    const form = new ActionFormData()
        .title("AdminUtils GUI")
        .body("Select an option")
        .button("Admin settings")
        .button("Admin commands");
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

function adminSettings(p) { //Maybe make it so that if you're an admin you can't simply remove another admin
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
                    } else if (!isValidUsername(admin)) {
                        await runCmd(overworld, `execute @a[name="${p.name}"] ~~~ tellraw @s {"rawtext": [{ "text": "§cError, that doesn't look like a valid username.§r" }]}`);
                    } else {
                        let form = new MessageFormData();
                        form.title("Admin settings");
                        form.body(`Are you sure you want to set §b${admin}§r as an admin? §4This will remove all the previous admins.`);
                        form.button1("No");
                        form.button2("Yes");
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
                const adminsArray = world.scoreboard.getObjective('-au').getParticipants().map(admin => admin.displayName.match(/(?<=-au)[^]+(?=-au)/)[0]);
                let form = new ModalFormData();
                form.title("Admin settings");
                form.dropdown("Admins list", adminsArray);
                form.show(p);
            } break;
        }
    });
}

function adminCommands(p) {
    const form = new ActionFormData()
        .title("Admin commands")
        .body("Select a command")
        .button("<-- Back")
        .button("Ban or unban menu")
        .button("Simulated player")
        .button("Projectiles powers")
        .button("Freeze or unfreeze a player")
        .button("Kill a player")
        .button("Launch a player")
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
            case 3: { //Projectiles powers
                projectilePowers(p);
            } break;
            case 4: { //Freeze or unfreeze a player
                function freezeUnfreeze() {
                    const form = new ActionFormData()
                        .title("Freeze or unfreeze a player")
                        .body("Select an option")
                        .button("<-- Back")
                        .button("Freeze a player")
                        .button("Unfreeze a player");
                    form.show(p).then((response) => {
                        if (response.selection === 0) {
                            adminCommands(p);
                        } else if (response.selection === 1) {
                            const locPlayers = players.filter(player => !isFrozen(player.name));
                            const form = new ActionFormData()
                                .title("Freeze a player")
                                .body("Select an online player to freeze.\nIf you don't see someone here, it means he's already frozen.")
                                .button("<-- Back")
                                .button("Type a player manually instead");
                            for (const player of locPlayers) {
                                form.button(player.name, "textures/icons/steve_icon.png");
                            }

                            form.show(p).then((response) => {
                                if (response.selection === 0) {
                                    freezeUnfreeze();
                                } else if (response.selection === 1) {
                                    let form = new ModalFormData()
                                        .title("Freeze a player")
                                        .textField("Type below the player you would like to freeze.", "Player's name");
                                    form.show(p).then(async result => {
                                        const playerName = result.formValues[0];
                                        if (!isValidUsername(playerName)) {
                                            await runTellraw(p, '§cError, the username you entered is invalid.');
                                        } else if (isFrozen(playerName)) {
                                            await runTellraw(p, '§cError, the player is already frozen.');
                                        } else {
                                            try { //Poner "-au+" en cada coordenada si el jugador no está conectado
                                                const query = {
                                                    name: playerName
                                                };
                                                const selectedPlayer = [...world.getPlayers(query)][0];
                                                if (selectedPlayer !== undefined) {
                                                    await runCmd(p, `scoreboard players set "-auname${playerName} -au${selectedPlayer.location.x} -au${selectedPlayer.location.y} -au${selectedPlayer.location.z}" -aufrozen 0`);
                                                    await runTellraw(p, `§aThe player §b${playerName}§a has been successfully frozen.`);
                                                } else {
                                                    await runCmd(p, `scoreboard players set "-auname${playerName} -au+ -au+ -au+" -aufrozen 0`);
                                                    await runTellraw(p, `§aThe player §b${playerName}§a has been successfully frozen.`);
                                                }
                                            } catch (e) {
                                                await runTellraw(p, `§cError, the player couldn't be frozen.`);
                                            }
                                        }
                                    });
                                } else if (response.selection >= 2) {
                                    const selectedPlayer = locPlayers[response.selection - 2];
                                    const form = new MessageFormData()
                                        .title("Freeze a player")
                                        .body(`Are you sure you want to freeze §b${selectedPlayer.name}§r?`)
                                        .button1("No")
                                        .button2("Yes");
                                    form.show(p).then(async result => {
                                        if (result.selection === 1) {
                                            try {
                                                await runCmd(selectedPlayer.dimension, `scoreboard players set "-auname${selectedPlayer.name} -au${selectedPlayer.location.x} -au${selectedPlayer.location.y} -au${selectedPlayer.location.z}" -aufrozen 0`);
                                                await runTellraw(p, `§aThe player §b${selectedPlayer.name}§a has been successfully frozen.`);
                                            } catch (e) {
                                                await runTellraw(p, `§cError, the player couldn't be frozen.`);
                                            }
                                        }
                                    });
                                }
                            });
                        } else if (response.selection === 2) {
                            const frozenPlayers = [...world.scoreboard.getObjective('-aufrozen').getParticipants().map(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1])];
                            const form = new ActionFormData()
                                .title("Unfreeze a player")
                                .body("Select an online/offline frozen player to unfreeze")
                                .button("<-- Back");
                            for (const player of frozenPlayers) {
                                form.button(player, "textures/icons/steve_icon.png");
                            }

                            form.show(p).then((response) => {
                                if (response.selection === 0) {
                                    freezeUnfreeze();
                                } else if (response.selection >= 1) {
                                    const selectedPlayer = frozenPlayers[response.selection - 1];
                                    const form = new MessageFormData()
                                        .title("Unfreeze a player")
                                        .body(`Are you sure you want to unfreeze §b${selectedPlayer}§r?`)
                                        .button1("No")
                                        .button2("Yes");
                                    form.show(p).then(async result => {
                                        if (result.selection === 1) {
                                            try {
                                                const scoreboard = world.scoreboard.getObjective('-aufrozen').getParticipants().filter(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1] === selectedPlayer)[0].displayName;
                                                await runCmd(p, `scoreboard players reset "${scoreboard}" -aufrozen`);
                                                await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been successfully unfrozen.`);
                                            } catch (e) {
                                                await runTellraw(p, `§cError, the player couldn't be unfrozen.`);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                freezeUnfreeze();
            } break;
            case 5: { //Kill a player 
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
                                    await runTellraw(p, `§aThe player §b${playerName}§a has been successfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            } else if (result.formValues[1] === false) {
                                try {
                                    await runCmd(overworld, `kill ${playerName}`);
                                    await runTellraw(p, `§aThe player §b${playerName}§a has been successfully killed.`);
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
                                    await runTellraw(p, `§aThe player §b${selectedPlayer.name}§a has been successfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            } else if (result.formValues[0] === false) {
                                try {
                                    await runCmd(overworld, `kill ${selectedPlayer.name}`);
                                    await runTellraw(p, `§aThe player §b${selectedPlayer.name}§a has been successfully killed.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player couldn't be killed or wasn't found.`);
                                }
                            }
                        });
                    }
                });
            } break;
            case 6: { //Launch a player
                const locPlayers = players;
                const form = new ActionFormData()
                    .title("Launch a player")
                    .body("Select an online player to launch")
                    .button("<-- Back")
                    .button("Type a player manually instead");
                for (const player of locPlayers) {
                    form.button(player.name, "textures/icons/steve_icon.png");
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
                            } else {
                                const { successCount } = await runCmd(p, `testfor "${player}"`);
                                if (successCount === 0) {
                                    await runTellraw(p, '§cError, the player you entered is not online.');
                                } else {
                                    try {
                                        const query = {
                                            name: player
                                        };
                                        const playerRaw = [...world.getPlayers(query)][0];
                                        playerRaw.runCommand('playsound player_launch @a ~ ~ ~ 100');
                                        await runCmd(playerRaw, `execute @s ~~~ summon fireworks_rocket`);
                                        for (let i = 0; i < 5; i++) {
                                            runCmd(playerRaw, `execute @s ~~~ particle minecraft:cauldron_explosion_emitter`);
                                        }
                                        particles();
                                        async function particles() {
                                            for (let i = 0; i < 23; i++) {
                                                const delay = ticks => new Promise(res => system.runTimeout(res, ticks));
                                                await delay(0.05);
                                                playerRaw.runCommand(`execute @s ~~~ particle minecraft:explosion_manual`);
                                            }
                                        }
                                        await runCmd(playerRaw, `effect @s levitation 3 150 true`);
                                        await runTellraw(p, `§aThe player §b${player}§a has been launched successfully.`);
                                    } catch (e) {
                                        await runTellraw(p, `§cError, the player §4${player}§c couldn't be launched.`);
                                    }
                                }
                            }
                        });
                    } else if (response.selection > 1) {
                        const selectedPlayerRaw = locPlayers[response.selection - 2];

                        let form = new MessageFormData()
                            .title("Launch a player")
                            .body(`Are you sure you want to launch §b${selectedPlayerRaw.name}§r?`)
                            .button1("No")
                            .button2("Yes");
                        form.show(p).then(async result => {
                            if (result.selection === 1) {
                                try {
                                    selectedPlayerRaw.runCommand('playsound player_launch @a ~ ~ ~ 100');
                                    await runCmd(selectedPlayerRaw, `execute @s ~~~ summon fireworks_rocket`);
                                    for (let i = 0; i < 5; i++) {
                                        runCmd(selectedPlayerRaw, `execute @s ~~~ particle minecraft:cauldron_explosion_emitter`);
                                    }
                                    particles();
                                    async function particles() {
                                        for (let i = 0; i < 23; i++) {
                                            const delay = ticks => new Promise(res => system.runTimeout(res, ticks));
                                            await delay(0.05);
                                            selectedPlayerRaw.runCommand(`execute @s ~~~ particle minecraft:explosion_manual`);
                                        }
                                    }
                                    await runCmd(selectedPlayerRaw, `effect @s levitation 3 150 true`);
                                    await runTellraw(p, `§aThe player §b${selectedPlayerRaw.name}§a has been launched successfully.`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, the player §4${selectedPlayerRaw.name}§c couldn't be launched.`);
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
        if (!isBanned(player) && !isAdmin(player)) {
            form.button(player, "textures/icons/steve_icon.png");
            notBannedPlayers.push(player);
        }
    }

    form.show(p).then((response) => {
        if (response.selection === 0) {
            banUnbanMenu(p);
        } else if (response.selection === 1) {
            let form = new ModalFormData()
                .title("Ban menu")
                .textField("Type below the player you would like to ban.", "Player's name") //0
                .textField("Enter a reason:", "Reason") //1
                .toggle("Permanent ban", false) //2
                .slider("Years", 0, 10, 1, 0) //3
                .slider("Months", 0, 11, 1, 0) //4
                .slider("Weeks", 0, 3, 1, 0) //5
                .slider("Days", 0, 6, 1, 0) //6
                .slider("Hours", 0, 23, 1, 0) //7
                .slider("Minutes", 0, 59, 1, 0) //8
                .slider("Seconds", 0, 59, 1, 0); //9
            form.show(p).then(async result => {
                if (result.canceled) return;
                const player = result.formValues[0];
                const reason = result.formValues[1];
                const isPermaBanned = result.formValues[2];
                const bannedBy = p.name;
                if (isPermaBanned === true) {
                    if (reason === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (isBanned(player)) {
                        await runTellraw(p, `§cError, the specified player is already banned.`);

                    } else if (isAdmin(player)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                    } else if (!isValidUsername(player)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${player}-aureason${reason}-auban${bannedBy}-autime-aupermabanned-au" -auban 0`);
                            try {
                                await runCmd(overworld, `kick "${player}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou have been permanently banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§r§l§6----------------------------§r"`);
                            } catch (e) { }
                            await runTellraw(p, `§aThe player §b${player}§a has been banned successfully with reason: §c${reason}\n§2Time: §3Permanently`);
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't ban the player.`);
                        }
                    }
                } else {
                    const banYears = result.formValues[3];
                    const banMonths = result.formValues[4];
                    const banWeeks = result.formValues[5]; //Only to calculate the respective days and add them to banDays
                    const banDays = result.formValues[6]; //Specified days without taking the weeks into account, include this in the kick cmd
                    const banTotalDays = banDays + banWeeks * 7;
                    const banHours = result.formValues[7];
                    const banMinutes = result.formValues[8];
                    const banSeconds = result.formValues[9];

                    const unBanDate = moment();
                    unBanDate.add(banYears, 'years');
                    unBanDate.add(banMonths, 'months');
                    unBanDate.add(banTotalDays, 'days');
                    unBanDate.add(banHours, 'hours');
                    unBanDate.add(banMinutes, 'minutes');
                    unBanDate.add(banSeconds, 'seconds');

                    const unBanISO = unBanDate.toISOString(); //Date when you will get unbanned

                    if (reason === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (isBanned(player)) {
                        await runTellraw(p, `§cError, the specified player is already banned.`);

                    } else if (isAdmin(player)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                    } else if (!isValidUsername(player)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${player}-aureason${reason}-auban${bannedBy}-autime${unBanISO}" -auban 0`);
                            const years = banYears === 0 ? "" : banYears === 1 ? `${banYears} year ` : `${banYears} years `;
                            const months = banMonths === 0 ? "" : banMonths === 1 ? `${banMonths} month ` : `${banMonths} months `;
                            const weeks = banWeeks === 0 ? "" : banWeeks === 1 ? `${banWeeks} week ` : `${banWeeks} weeks `;
                            const days = banDays === 0 ? "" : banDays === 1 ? `${banDays} day ` : `${banDays} days `;
                            const hours = banHours === 0 ? "" : banHours === 1 ? `${banHours} hour ` : `${banHours} hours `;
                            const minutes = banMinutes === 0 ? "" : banMinutes === 1 ? `${banMinutes} minute ` : `${banMinutes} minutes `;
                            const seconds = banSeconds === 0 ? "" : banSeconds === 1 ? `${banSeconds} second` : `${banSeconds} seconds`;
                            try {
                                await runCmd(overworld, `kick "${player}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou have been temporarily banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§4Time: §c${years}${months}${weeks}${days}${hours}${minutes}${seconds}\n§r§l§6----------------------------§r"`);
                            } catch (e) { }
                            await runTellraw(p, `§aThe player §b${player}§a has been banned successfully with reason: §c${reason}\n§2Time: §3${years}${months}${weeks}${days}${hours}${minutes}${seconds}`);
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't ban the player.`);
                        }
                    }
                }
            });
        } else if (response.selection > 1) {
            const selectedPlayer = notBannedPlayers[response.selection - 2];

            let form = new ModalFormData()
                .title("Ban menu")
                .textField("Enter a reason:", "Reason") //0
                .toggle("Permanent ban", false) //1
                .slider("Years", 0, 10, 1, 0) //2
                .slider("Months", 0, 11, 1, 0) //3
                .slider("Weeks", 0, 3, 1, 0) //4
                .slider("Days", 0, 6, 1, 0) //5
                .slider("Hours", 0, 23, 1, 0) //6
                .slider("Minutes", 0, 59, 1, 0) //7
                .slider("Seconds", 0, 59, 1, 0); //8
            form.show(p).then(async result => {
                if (result.canceled) return;
                const reason = result.formValues[0];
                const isPermaBanned = result.formValues[1];
                const bannedBy = p.name;
                if (isPermaBanned === true) {
                    if (reason === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);
                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${selectedPlayer}-aureason${reason}-auban${bannedBy}-autime-aupermabanned-au" -auban 0`);
                            try {
                                await runCmd(overworld, `kick "${selectedPlayer}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou have been permanently banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§r§l§6----------------------------§r"`);
                            } catch (e) { }
                            await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been banned successfully with reason: §c${reason}\n§2Time: §3Permanently`);
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't ban the player.`);
                        }
                    }
                } else {
                    const banYears = result.formValues[2];
                    const banMonths = result.formValues[3];
                    const banWeeks = result.formValues[4]; //Only to calculate the respective days and add them to banDays
                    const banDays = result.formValues[5]; //Specified days without taking the weeks into account, include this in the kick cmd
                    const banTotalDays = banDays + banWeeks * 7;
                    const banHours = result.formValues[6];
                    const banMinutes = result.formValues[7];
                    const banSeconds = result.formValues[8];

                    const unBanDate = moment();
                    unBanDate.add(banYears, 'years');
                    unBanDate.add(banMonths, 'months');
                    unBanDate.add(banTotalDays, 'days');
                    unBanDate.add(banHours, 'hours');
                    unBanDate.add(banMinutes, 'minutes');
                    unBanDate.add(banSeconds, 'seconds');

                    const unBanISO = unBanDate.toISOString(); //Date when you will get unbanned

                    if (reason === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (isBanned(player)) {
                        await runTellraw(p, `§cError, the specified player is already banned.`);

                    } else if (isAdmin(player)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                    } else if (!isValidUsername(player)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${selectedPlayer}-aureason${reason}-auban${bannedBy}-autime${unBanISO}" -auban 0`);
                            const years = banYears === 0 ? "" : banYears === 1 ? `${banYears} year ` : `${banYears} years `;
                            const months = banMonths === 0 ? "" : banMonths === 1 ? `${banMonths} month ` : `${banMonths} months `;
                            const weeks = banWeeks === 0 ? "" : banWeeks === 1 ? `${banWeeks} week ` : `${banWeeks} weeks `;
                            const days = banDays === 0 ? "" : banDays === 1 ? `${banDays} day ` : `${banDays} days `;
                            const hours = banHours === 0 ? "" : banHours === 1 ? `${banHours} hour ` : `${banHours} hours `;
                            const minutes = banMinutes === 0 ? "" : banMinutes === 1 ? `${banMinutes} minute ` : `${banMinutes} minutes `;
                            const seconds = banSeconds === 0 ? "" : banSeconds === 1 ? `${banSeconds} second` : `${banSeconds} seconds`;
                            try {
                                await runCmd(overworld, `kick "${selectedPlayer}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou have been temporarily banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§4Time: §c${years}${months}${weeks}${days}${hours}${minutes}${seconds}\n§r§l§6----------------------------§r"`);
                            } catch (e) { }
                            await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been banned successfully with reason: §c${reason}\n§2Time: §3${years}${months}${weeks}${days}${hours}${minutes}${seconds}`);
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't ban the player.`);
                        }
                    }
                }
            });
        }
    });
}

function unBanPlayer(p) {
    const form = new ActionFormData();
    form.title("Unban menu");
    form.body("Select a player to unban");
    form.button("<-- Back");
    form.button("Type a player manually instead");

    const bannedPlayers = getBannedPlayers();
    for (const player of bannedPlayers) {
        if (!isAdmin(player)) {
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
                const player = result.formValues[0];
                const reason = getBanReason(player);
                const bannedBy = getBannedBy(player);
                const banISO = getUnBanISO(player);

                if (!isBanned(player)) {
                    await runTellraw(p, `§cError, the specified player is not banned.`);

                } else if (!isValidUsername(player)) {
                    await runTellraw(p, `§cError, the username you entered is invalid.`);

                } else if (isBanned(player) && isValidUsername(player)) {
                    try {
                        await runCmd(overworld, `scoreboard players reset "${player}-aureason${reason}-auban${bannedBy}-autime${banISO}" -auban`);
                        await runTellraw(p, `§aThe player §b${player}§a has been unbanned successfully.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't unban the player, perhaps the ban time is now over.`);
                    }
                }
            });
        } else if (response.selection > 1) {
            let selectedPlayer = bannedPlayers[response.selection - 2];

            let form = new MessageFormData();
            form.title("Unban menu");
            form.body(`Are you sure you want to unban §b${selectedPlayer}§r?`);
            form.button1("No");
            form.button2("Yes");
            form.show(p).then(async result => {
                if (result.selection === 1) {
                    const reason = getBanReason(selectedPlayer);
                    const bannedBy = getBannedBy(selectedPlayer);
                    const banISO = getUnBanISO(selectedPlayer);
                    try {
                        await runCmd(overworld, `scoreboard players reset "${selectedPlayer}-aureason${reason}-auban${bannedBy}-autime${banISO}" -auban`);
                        await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been unbanned successfully.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't unban the player, perhaps the ban time is now over.`);
                    }
                }
            });
        }
    });
}

function projectilePowers(p) {
    const form = new ActionFormData()
        .title("Projectiles powers")
        .body("Select an option")
        .button("<-- Back")
        .button("Snowball powers")
        .button("Arrow powers")
        .button("Egg powers");
    form.show(p).then((response) => {
        if (response.selection === 0) {
            adminCommands(p);
        } else if (response.selection >= 1) {
            const playersArray = players.map(pname => pname.name);
            const projectiles = ["snowball", "arrow", "egg"];
            const selectedProj = projectiles[response.selection - 1];
            const form = new ActionFormData()
                .title("Toggle for a player")
                .body("Select an online player to enable/disable certain powers when throwing a snowball at an entity.\nYou will be able to select those powers later.")
                .button("<-- Back")
                .button("Type a player manually instead");
            for (const player of playersArray) {
                form.button(player, "textures/icons/steve_icon.png");
            }

            form.show(p).then((response) => {
                if (response.selection === 0) {
                    projectilePowers(p);
                } else if (response.selection === 1) {
                    let form = new ModalFormData()
                        .title("Toggle for a player")
                        .textField("Type below the player you would like to enable/disable the powers.", "Player's name");
                    form.show(p).then(async result => {
                        const player = result.formValues[0];
                        if (!isValidUsername(player)) {
                            await runTellraw(p, "§Error, the username you entered is invalid.");
                        } else {
                            const bolt = isPowerEnabled(player, selectedProj, "bolt");
                            const freeze = isPowerEnabled(player, selectedProj, "freeze");
                            const tnt = isPowerEnabled(player, selectedProj, "tnt");

                            let form = new ModalFormData()
                                .title(`${player}'s ${selectedProj} powers`)
                                .toggle("Lightning bolt", bolt)
                                .toggle("Freeze", freeze)
                                .toggle("TNT", tnt);
                            form.show(p).then(async result => {
                                const _bolt = result.formValues[0];
                                const boltstate = _bolt === true ? "on" : "off";

                                const _freeze = result.formValues[1];
                                const freezestate = _freeze === true ? "on" : "off";

                                const _tnt = result.formValues[2];
                                const tntstate = _tnt === true ? "on" : "off";

                                try {
                                    if (_bolt !== bolt) {
                                        await setPower(player, selectedProj, "bolt", boltstate);
                                    }
                                    if (_freeze !== freeze) {
                                        await setPower(player, selectedProj, "freeze", freezestate);
                                    }
                                    if (_tnt !== tnt) {
                                        await setPower(player, selectedProj, "tnt", tntstate);
                                    }
                                    await runTellraw(p, `§aThe powers have been set correctly. Showing current state of all the powers for §b${player}§a:\n§7* §bLightning bolt: ${boltstate === "on" ? "§a" : "§c"}${boltstate}\n§7* §bFreeze: ${freezestate === "on" ? "§a" : "§c"}${freezestate}\n§7* §bTnt: ${tntstate === "on" ? "§a" : "§c"}${tntstate}`);
                                } catch (e) {
                                    await runTellraw(p, `§cError, one or more powers couldn't be enabled/disabled.`);
                                }
                            });
                        }
                    });
                } else if (response.selection > 1) {
                    const selectedPlayer = playersArray[response.selection - 2];
                    const bolt = isPowerEnabled(selectedPlayer, selectedProj, "bolt");
                    const freeze = isPowerEnabled(selectedPlayer, selectedProj, "freeze");
                    const tnt = isPowerEnabled(selectedPlayer, selectedProj, "tnt");

                    let form = new ModalFormData()
                        .title(`${selectedPlayer}'s ${selectedProj} powers`)
                        .toggle("Lightning bolt", bolt)
                        .toggle("Freeze", freeze)
                        .toggle("TNT", tnt);
                    form.show(p).then(async result => {
                        const _bolt = result.formValues[0];
                        const boltstate = _bolt === true ? "on" : "off";

                        const _freeze = result.formValues[1];
                        const freezestate = _freeze === true ? "on" : "off";

                        const _tnt = result.formValues[2];
                        const tntstate = _tnt === true ? "on" : "off";

                        try {
                            if (_bolt !== bolt) {
                                await setPower(selectedPlayer, selectedProj, "bolt", boltstate);
                            }
                            if (_freeze !== freeze) {
                                await setPower(selectedPlayer, selectedProj, "freeze", freezestate);
                            }
                            if (_tnt !== tnt) {
                                await setPower(selectedPlayer, selectedProj, "tnt", tntstate);
                            }
                            await runTellraw(p, `§aThe powers have been set correctly. Showing current state of all the powers for §b${selectedPlayer}§a:\n§7* §bLightning bolt: ${boltstate === "on" ? "§a" : "§c"}${boltstate}\n§7* §bFreeze: ${freezestate === "on" ? "§a" : "§c"}${freezestate}\n§7* §bTnt: ${tntstate === "on" ? "§a" : "§c"}${tntstate}`);
                        } catch (e) {
                            await runTellraw(p, `§cError, one or more powers couldn't be enabled/disabled.`);
                        }
                    });
                }
            });
        }
    });
}

function simPlayer(p) {
    const form = new ActionFormData()
        .title("Create a simulated player")
        .body("What would you like the simulated player to do?")
        .button("<-- Back")
        .button("Attack and follow a player")
        .button("Follow a player")
        .button("Idle")
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0: { //Back
                adminCommands(p);
            } break;
            case 1: { //Attack and follow a player 
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

                            if (isValidUsername(victim)) {
                                const { successCount } = await runCmd(p, `testfor "${victim}"`);
                                if (successCount !== 0) {
                                    GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                        const spawnLoc = new Vector(1, 2, 1);
                                        const player = test.spawnSimulatedPlayer(spawnLoc, simName, GameMode.creative);
                                        player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                        player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                        player.addEffect(MinecraftEffectTypes.strength, 99999, 2, false);
                                        overworld.runCommand('fill 1234564 0 -1234563 1234568 319 -1234567 air');
                                        const { successCount } = overworld.runCommand('testfor @e[type=au:basedetect, x=1234567, y=225, z=-1234567, r=20]');
                                        if (successCount === 0) {
                                            overworld.runCommand('summon au:basedetect 1234567 225 -1234567');
                                        }

                                        test
                                            .startSequence()
                                            .thenExecuteFor(timeInTicks, async () => {
                                                player.lookAtEntity(victimEntity);
                                                player.navigateToEntity(victimEntity);
                                                player.attackEntity(victimEntity);

                                                const { successCount } = await runCmd(player, `testfor @a[name="${victim}", r=10]`);
                                                if (successCount === 0) {
                                                    await runCmd(player, `tp @s "${victim}"`);
                                                }
                                            })
                                    })
                                        .maxTicks(timeInTicks)
                                        .setupTicks(0)
                                        .structureName("SimFolder:simtest")
                                        .tag(GameTest.Tags.suiteDefault);
                                    overworld.runCommand(`execute @e[c=1] 1234567 318 -1234567 gametest run simtest:sim_test${simtest} false 1`);
                                    simtest++;
                                } else {
                                    await runTellraw(p, '§cError, the player you entered is not online.');
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

                            const { successCount } = await runCmd(p, `testfor "${selectedPlayerRaw.name}"`);
                            if (successCount !== 0) {
                                GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                    const spawnLoc = new Vector(1, 2, 1);
                                    const player = test.spawnSimulatedPlayer(spawnLoc, simName, GameMode.creative);
                                    player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                    player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                    player.addEffect(MinecraftEffectTypes.strength, 99999, 2, false);
                                    overworld.runCommand('fill 1234564 0 -1234563 1234568 319 -1234567 air');
                                    const { successCount } = overworld.runCommand('testfor @e[type=au:basedetect, x=1234567, y=225, z=-1234567, r=20]');
                                    if (successCount === 0) {
                                        overworld.runCommand('summon au:basedetect 1234567 225 -1234567');
                                    }

                                    test
                                        .startSequence()
                                        .thenExecuteFor(timeInTicks, async () => {
                                            player.lookAtEntity(selectedPlayerRaw);
                                            player.navigateToEntity(selectedPlayerRaw);
                                            player.attackEntity(selectedPlayerRaw);

                                            const { successCount } = await runCmd(player, `testfor @a[name="${selectedPlayerRaw.name}", r=10]`);
                                            if (successCount === 0) {
                                                await runCmd(player, `tp @s "${selectedPlayerRaw.name}"`);
                                            }
                                        })
                                })
                                    .maxTicks(timeInTicks)
                                    .setupTicks(0)
                                    .structureName("SimFolder:simtest")
                                    .tag(GameTest.Tags.suiteDefault);
                                overworld.runCommand(`execute @e[c=1] 1234567 318 -1234567 gametest run simtest:sim_test${simtest} false 1`);
                                simtest++;
                            } else {
                                await runTellraw(p, '§cError, the player you selected is now offline.');
                            }
                        });
                    }
                });
            } break;
            case 2: { //Follow a player 
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

                            if (isValidUsername(victim)) {
                                const { successCount } = await runCmd(overworld, `testfor "${victim}"`);
                                if (successCount !== 0) {
                                    GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                        const spawnLoc = new Vector(1, 2, 1);
                                        const player = test.spawnSimulatedPlayer(spawnLoc, simName, GameMode.creative);
                                        player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                        player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                        overworld.runCommand('fill 1234564 0 -1234563 1234568 319 -1234567 air');
                                        const { successCount } = overworld.runCommand('testfor @e[type=au:basedetect, x=1234567, y=225, z=-1234567, r=20]');
                                        if (successCount === 0) {
                                            overworld.runCommand('summon au:basedetect 1234567 225 -1234567');
                                        }

                                        test
                                            .startSequence()
                                            .thenExecuteFor(timeInTicks, async () => {
                                                player.lookAtEntity(victimEntity);
                                                player.navigateToEntity(victimEntity);

                                                const { successCount } = await runCmd(player, `testfor @a[name="${victim}", r=10]`);
                                                if (successCount === 0) {
                                                    await runCmd(player, `tp @s "${victim}"`);
                                                }
                                            })
                                    })
                                        .maxTicks(timeInTicks)
                                        .setupTicks(0)
                                        .structureName("SimFolder:simtest")
                                        .tag(GameTest.Tags.suiteDefault);
                                    overworld.runCommand(`execute @e[c=1] 1234567 318 -1234567 gametest run simtest:sim_test${simtest} false 1`);
                                    simtest++;
                                } else {
                                    await runTellraw(p, '§cError, the player you entered is not online.');
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

                            const { successCount } = await runCmd(p, `testfor "${selectedPlayerRaw.name}"`);
                            if (successCount !== 0) {
                                GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                                    const spawnLoc = new Vector(1, 2, 1);
                                    const player = test.spawnSimulatedPlayer(spawnLoc, simName, GameMode.creative);
                                    player.addEffect(MinecraftEffectTypes.speed, 99999, 4, false);
                                    player.addEffect(MinecraftEffectTypes.jumpBoost, 99999, 1, false);
                                    overworld.runCommand('fill 1234564 0 -1234563 1234568 319 -1234567 air');
                                    const { successCount } = overworld.runCommand('testfor @e[type=au:basedetect, x=1234567, y=225, z=-1234567, r=20]');
                                    if (successCount === 0) {
                                        overworld.runCommand('summon au:basedetect 1234567 225 -1234567');
                                    }

                                    test
                                        .startSequence()
                                        .thenExecuteFor(timeInTicks, async () => {
                                            player.lookAtEntity(selectedPlayerRaw);
                                            player.navigateToEntity(selectedPlayerRaw);

                                            const { successCount } = await runCmd(player, `testfor @a[name="${selectedPlayerRaw.name}", r=10]`);
                                            if (successCount === 0) {
                                                await runCmd(player, `tp @s "${selectedPlayerRaw.name}"`);
                                            }
                                        })
                                })
                                    .maxTicks(timeInTicks)
                                    .setupTicks(0)
                                    .structureName("SimFolder:simtest")
                                    .tag(GameTest.Tags.suiteDefault);
                                overworld.runCommand(`execute @e[c=1] 1234567 318 -1234567 gametest run simtest:sim_test${simtest} false 1`);
                                simtest++;
                            } else {
                                await runTellraw(p, '§cError, the player you selected is now offline.');
                            }
                        });
                    }
                });
            } break;
            case 3: { //Idle 
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
                        let tpped = false;

                        GameTest.register("SimTest", `sim_test${simtest}`, (test) => {
                            const spawnLoc = new Vector(1, 2, 1);
                            const player = test.spawnSimulatedPlayer(spawnLoc, simName, GameMode.creative);
                            overworld.runCommand('fill 1234564 0 -1234563 1234568 319 -1234567 air');
                            const { successCount } = overworld.runCommand('testfor @e[type=au:basedetect, x=1234567, y=225, z=-1234567, r=20]');
                            if (successCount === 0) {
                                overworld.runCommand('summon au:basedetect 1234567 225 -1234567');
                            }

                            test
                                .startSequence()
                                .thenExecuteFor(timeInTicks, async () => {
                                    if (lookClosePlayer === true) {
                                        let closestP = [];
                                        let playerLoc = new Vector(player.location.x, player.location.y, player.location.z);
                                        const query = {
                                            closest: 1,
                                            maxDistance: 15,
                                            excludeNames: [player.name],
                                            location: playerLoc
                                        };
                                        try { closestP = [...player.dimension.getPlayers(query)][0] } catch (e) { }
                                        try { player.lookAtEntity(closestP) } catch (e) { }
                                    }
                                    if (!tpped) {
                                        try {
                                            await runCmd(player, `tp "${p.name}"`);
                                            tpped = true;
                                        } catch (e) { }
                                    }
                                })
                        })
                            .maxTicks(timeInTicks)
                            .setupTicks(0)
                            .structureName("SimFolder:simtest")
                            .tag(GameTest.Tags.suiteDefault);
                        overworld.runCommand(`execute @e[c=1] 1234567 318 -1234567 gametest run simtest:sim_test${simtest} false 1`);
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
    if (username.match(/^ | $/) !== null || username.match(/[^A-Za-z0-9À-ÿ\u00f1\u00d1 \(\)]+/) !== null || username === "") {
        return false;
    } else if (username.match(/^ | $/) === null && username.match(/[^A-Za-z0-9À-ÿ\u00f1\u00d1 \(\)]+/) === null && username !== "") {
        return true;
    }
}

function isAdmin(username) {
    if (admins.includes(`-au${username}-au`)) return true
    else return false;
}

function isBanned(player) {
    const bannedPlayers = getBannedPlayers();
    if (bannedPlayers.includes(player)) return true
    else return false;
}

function isPermaBanned(player) {
    if (getUnBanISO(player) === "-aupermabanned-au") return true
    else return false;
}

function isBanTimeOver(player) {
    try {
        const unBanDate = moment(getUnBanISO(player), moment.ISO_8601);
        const currentDate = moment();
        const remainingTime = moment.duration(unBanDate.diff(currentDate));
        const milliseconds = remainingTime.asMilliseconds();
        if (milliseconds <= 0) return true
        else return false;
    } catch (e) { return; }
}

function getBannedPlayers() {
    try {
        return world.scoreboard.getObjective('-auban').getParticipants().map(participant => participant.displayName.match(/[^]+(?=-aureason)/)[0]);
    } catch (e) {
        return;
    }
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
        bannedBys.push(bannedRawPlayer.displayName.match(/(?<=-auban)[^]+(?=-autime)/)[0]);
    }
    return bannedBys[bannedPlayers.indexOf(player)];
}

function getUnBanISO(player) {
    const bannedPlayers = world.scoreboard.getObjective('-auban').getParticipants();
    const matchISO = new RegExp(`(?<=${convertToRegExpFriendly(player)}-aureason.*-autime)[^]+`);
    const scoreboard = bannedPlayers.filter(participant => participant.displayName.match(matchISO) !== null)[0].displayName;
    return scoreboard.match(matchISO)[0];
}

function isPowerEnabled(pname, projectile, power) {
    let projScoreboard = [];
    try { projScoreboard = [...world.scoreboard.getObjective('-auProj').getParticipants().map(participant => participant.displayName)] } catch (e) { }
    const regexp = new RegExp(`(?<=-au${convertToRegExpFriendly(pname)}-au.*\\+${projectile}[^+]*-${power})on`);
    if (projScoreboard.some(participant => {
        try {
            if (participant.match(regexp)[0] === "on") return true;
        } catch (e) { }
    })) return true
    else return false;
}
/* const pname = "MisledPaul58976";
   const xd = "-auMisledPaul58976-au+snowball-bolton+arrow-boltoff";
   const projectile = "snowball";
   const power = "bolt";
   const regexp = new RegExp(`(?<=-au${pname}-au.*\\+${projectile}[^+]*-${power})on`);

   console.log(xd.match(regexp)[0]);
*/
async function setPower(pname, projectile, power, state) {
    let projScoreboard = [];
    try { projScoreboard = [...world.scoreboard.getObjective('-auProj').getParticipants().map(participant => participant.displayName).filter(participant => participant.includes(`-au${pname}-au`))] } catch (e) { }
    const regexp = new RegExp(`(?<=-au${convertToRegExpFriendly(pname)}-au.*\\+${projectile}[^+]*-${power})(?:on|off)`); //"+" is escaped two times because of the ``

    if (projScoreboard.length !== 0) { //If the array is not empty
        try { await runCmd(overworld, `scoreboard players reset "${projScoreboard[0]}" -auProj`) } catch (e) { }
        const newScoreboard = projScoreboard[0].replace(regexp, state);
        await runCmd(overworld, `scoreboard players set "${newScoreboard}" -auProj 0`);

    } else { //If the array is empty
        const scoreboard = `-au${pname}-au+snowball-boltoff-freezeoff-tntoff+arrow-boltoff-freezeoff-tntoff+egg-boltoff-freezeoff-tntoff`;
        const newScoreboard = scoreboard.replace(regexp, state);
        await runCmd(overworld, `scoreboard players set "${newScoreboard}" -auProj 0`);
    }
}

function isFrozen(player) {
    try {
        if (world.scoreboard.getObjective('-aufrozen').getParticipants().map(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1]).includes(player)) return true
        else return false;
    } catch (e) { return false }
}

function convertToRegExpFriendly(str) {
    return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}