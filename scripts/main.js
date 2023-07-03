import { world, MinecraftEffectTypes, GameMode, system, Vector, TicksPerSecond } from "@minecraft/server";
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
        try { await runCmd(overworld, 'scoreboard objectives add -auBan dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auProj dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auFrozen dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auJailed dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auJailLoc dummy') } catch (e) { }
        try { await runCmd(overworld, 'scoreboard objectives add -auJailExitLoc dummy') } catch (e) { }
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
                const positions = world.scoreboard.getObjective('-auFrozen').getParticipants().filter(participant => participant.displayName.match(/-auname([^]*) -au-?[0-9]+[^]* -au-?[0-9]+[^]* -au-?[0-9]+[^]*/)[1] === player.name)[0].displayName.match(/-au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*)/).slice(1).map(pos => pos * 1); //Gets the positions where the player was frozen and converts it to integer or float
                try { player.teleport(new Vector(positions[0], positions[1], positions[2]), { dimension: player.dimension }) } catch (e) { }
                //positions[0] is the x, positions[1] the y and positions[2] the z
            } catch (e) {
                const scoreboard = world.scoreboard.getObjective('-auFrozen').getParticipants().filter(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1] === player.name)[0].displayName;
                await runCmd(player.dimension, `scoreboard players reset "${scoreboard}" -auFrozen`);
                await runCmd(player.dimension, `scoreboard players set "-auname${player.name} -au${player.location.x} -au${player.location.y} -au${player.location.z}" -auFrozen 0`);
            }
        }
    }

    for (const bannedPlayer of getBannedPlayers().filter(player => !isPermaBanned(player))) {
        if (isBanTimeOver(bannedPlayer)) {
            const reason = getBanReason(bannedPlayer);
            const bannedBy = getBannedBy(bannedPlayer);
            const banISO = getUnBanISO(bannedPlayer);
            await runCmd(overworld, `scoreboard players reset "${bannedPlayer}-aureason${reason}-auban${bannedBy}-autime${banISO}" -auBan`);
        }
    }

    for (const jailedPlayer of getJailedPlayers()) {
        const reason = getJailReason(jailedPlayer);
        const jailedBy = getJailedBy(jailedPlayer);
        const jailedPlayerRaw = world.getPlayers({ name: jailedPlayer })[0];

        if (isJailTimeOver(jailedPlayer)) {
            const releaseISO = getReleaseISO(jailedPlayer);
            await runCmd(overworld, `scoreboard players reset "${jailedPlayer}-aureason${reason}-auban${jailedBy}-autime${releaseISO}" -auJailed`);
            jailedPlayerRaw.teleport(getJailExitLoc()[0], getJailExitLoc()[1]);
            await runCmd(jailedPlayerRaw, 'gamemode survival');
        } else {
            jailedPlayerRaw.runCommand('gamemode adventure');
            jailedPlayerRaw.addEffect(MinecraftEffectTypes.resistance, 2 * TicksPerSecond, { amplifier: 255, showParticles: false });
            jailedPlayerRaw.addEffect(MinecraftEffectTypes.weakness, 2 * TicksPerSecond, { amplifier: 255, showParticles: false });

            if (isPermaJailed(jailedPlayer)) {

            } else {
                const releaseDate = moment(getReleaseISO(jailedPlayer), moment.ISO_8601);
                const currentDate = moment();
                const remainingTime = moment.duration(releaseDate.diff(currentDate));

                const remainingYears = remainingTime.years();
                const remainingMonths = remainingTime.months();
                const remainingWeeks = remainingTime.weeks();
                remainingTime.subtract(remainingWeeks * 7, 'days');
                const remainingDays = remainingTime.days();
                const remainingHours = remainingTime.hours();
                const remainingMinutes = remainingTime.minutes();
                const remainingSeconds = remainingTime.seconds();

                const years = remainingYears === 0 ? "" : remainingYears === 1 ? `${remainingYears} year ` : `${remainingYears} years `;
                const months = remainingMonths === 0 ? "" : remainingMonths === 1 ? `${remainingMonths} month ` : `${remainingMonths} months `;
                const weeks = remainingWeeks === 0 ? "" : remainingWeeks === 1 ? `${remainingWeeks} week ` : `${remainingWeeks} weeks `;
                const days = remainingDays === 0 ? "" : remainingDays === 1 ? `${remainingDays} day ` : `${remainingDays} days `;
                const hours = remainingHours === 0 ? "" : remainingHours === 1 ? `${remainingHours} hour ` : `${remainingHours} hours `;
                const minutes = remainingMinutes === 0 ? "" : remainingMinutes === 1 ? `${remainingMinutes} minute ` : `${remainingMinutes} minutes `;
                const seconds = remainingSeconds === 0 ? "" : remainingSeconds === 1 ? `${remainingSeconds} second` : `${remainingSeconds} seconds`;

                jailedPlayerRaw.onScreenDisplay.setActionBar(`§l§o§m* §4Remaining time: §c${years}${months}${weeks}${days}${hours}${minutes}${seconds}\n§m* §4Reason: §c${reason}\n§m* §4Jailed by: §c${jailedBy}`);
            }
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
    } else if (isJailed(playerName)) {

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
            const lockMode = "none";
            for (let slot = 0; slot < player.getComponent("minecraft:inventory").inventorySize; slot++) {
                try { player.getComponent("minecraft:inventory").container.getSlot(slot).lockMode = lockMode; } catch (e) { }
            }
            const slots = ["head", "chest", "legs", "feet", "offhand"];
            for (const slot of slots) {
                try { player.getComponent("minecraft:equipment_inventory").getEquipmentSlot(slot).lockMode = lockMode } catch (e) { }
            }
            world.sendMessage(`${world.scoreboard.getObjective('-auJailLoc').getParticipants()[0]?.displayName}`);
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
    form.button("<-- Back", "textures/icons/back.png");
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
        .button("<-- Back", "textures/icons/back.png") //0
        .button("Ban or unban menu") //1
        .button("Jail menu") //2
        .button("Simulated player") //3
        .button("Projectiles powers") //4
        .button("Freeze or unfreeze a player", "textures/icons/freeze.png") //5
        .button("Kill a player") //6
        .button("Launch a player") //7
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0: { //Back 
                adminUtilsGui(p);
            } break;
            case 1: { //Ban or unban menu 
                banUnbanMenu(p);
            } break;
            case 2: { //Jail menu
                jailMenu(p);
            } break;
            case 3: { //Make a sim player menu 
                simPlayer(p);
            } break;
            case 4: { //Projectiles powers
                projectilePowers(p);
            } break;
            case 5: { //Freeze or unfreeze a player
                freezeUnfreeze();
                function freezeUnfreeze() {
                    const form = new ActionFormData()
                        .title("Freeze or unfreeze a player")
                        .body("Select an option")
                        .button("<-- Back", "textures/icons/back.png")
                        .button("Freeze a player", "textures/icons/freeze.png")
                        .button("Unfreeze a player", "textures/icons/unfreeze.png");
                    form.show(p).then((response) => {
                        if (response.selection === 0) {
                            adminCommands(p);
                        } else if (response.selection === 1) {
                            const locPlayers = players.filter(player => !isFrozen(player.name));
                            const form = new ActionFormData()
                                .title("Freeze a player")
                                .body("Select an online player to freeze.\nIf you don't see someone here, it means he's already frozen.")
                                .button("<-- Back", "textures/icons/back.png")
                                .button("Type an offline/online player manually instead", "textures/icons/pencil.png");
                            for (const player of locPlayers) {
                                form.button(player.name, "textures/icons/steve_icon.png");
                            }

                            form.show(p).then((response) => {
                                if (response.selection === 0) {
                                    freezeUnfreeze();
                                } else if (response.selection === 1) {
                                    let form = new ModalFormData()
                                        .title("Freeze a player")
                                        .textField("Type below the player you would like to freeze. In case the player is offline, it will get frozen as soon as it joins the world.", "Player's name");
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
                                                    await runCmd(p, `scoreboard players set "-auname${playerName} -au${selectedPlayer.location.x} -au${selectedPlayer.location.y} -au${selectedPlayer.location.z}" -auFrozen 0`);
                                                    await runTellraw(p, `§aThe player §b${playerName}§a has been successfully frozen.`);
                                                } else {
                                                    await runCmd(p, `scoreboard players set "-auname${playerName} -au+ -au+ -au+" -auFrozen 0`);
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
                                                await runCmd(selectedPlayer.dimension, `scoreboard players set "-auname${selectedPlayer.name} -au${selectedPlayer.location.x} -au${selectedPlayer.location.y} -au${selectedPlayer.location.z}" -auFrozen 0`);
                                                await runTellraw(p, `§aThe player §b${selectedPlayer.name}§a has been successfully frozen.`);
                                            } catch (e) {
                                                await runTellraw(p, `§cError, the player couldn't be frozen.`);
                                            }
                                        }
                                    });
                                }
                            });
                        } else if (response.selection === 2) {
                            const frozenPlayers = [...world.scoreboard.getObjective('-auFrozen').getParticipants().map(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1])];
                            const form = new ActionFormData()
                                .title("Unfreeze a player")
                                .body("Select an online/offline frozen player to unfreeze")
                                .button("<-- Back", "textures/icons/back.png");
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
                                                const scoreboard = world.scoreboard.getObjective('-auFrozen').getParticipants().filter(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1] === selectedPlayer)[0].displayName;
                                                await runCmd(p, `scoreboard players reset "${scoreboard}" -auFrozen`);
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
            } break;
            case 6: { //Kill a player 
                const playersArray = players.map(pname => pname.name);
                const locPlayers = players;
                const form = new ActionFormData()
                    .title("Kill a player")
                    .body("Select an online player to kill")
                    .button("<-- Back", "textures/icons/back.png")
                    .button("Type an online player instead", "textures/icons/pencil.png");
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
            case 7: { //Launch a player
                const locPlayers = players;
                const form = new ActionFormData()
                    .title("Launch a player")
                    .body("Select an online player to launch")
                    .button("<-- Back", "textures/icons/back.png")
                    .button("Type an online player instead", "textures/icons/pencil.png");
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
    const form = new ActionFormData()
        .title("Ban/unban menu")
        .body("Select an option")
        .button("<-- Back", "textures/icons/back.png")
        .button("Ban a player")
        .button("Unban a player");
    form.show(p).then((response) => {
        if (response.selection === 0) {
            adminCommands(p);
        } else if (response.selection === 1) {
            banPlayer(p);
        } else if (response.selection === 2) {
            unBanPlayer(p);
        }
    });
}

function banPlayer(p) {
    const playersArray = players.map(pname => pname.name);
    let notBannedPlayers = [];

    const form = new ActionFormData();
    form.title("Ban menu");
    form.body("Select an online player to ban (you cannot ban an admin)");
    form.button("<-- Back", "textures/icons/back.png");
    form.button("Type an offline/online player instead", "textures/icons/pencil.png");
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
                    if (reason.trim() === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (isBanned(player)) {
                        await runTellraw(p, `§cError, the specified player is already banned.`);

                    } else if (isAdmin(player)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                    } else if (!isValidUsername(player)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${player}-aureason${reason}-auban${bannedBy}-autime-aupermabanned-au" -auBan 0`);
                            try {
                                await runCmd(overworld, `kick "${player}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou have been permanently banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§r§l§6----------------------------§r"`);
                            } catch (e) { }
                            await runTellraw(p, `§aThe player §b${player}§a has been banned successfully with reason: §c${reason}\n§7* §2Time: §3Permanently`);
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

                    if (reason.trim() === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (result.formValues.slice(3).every(value => value === 0)) { //If all time values are 0
                        await runTellraw(p, `§cError, you must must specify a ban time.`);

                    } else if (isBanned(player)) {
                        await runTellraw(p, `§cError, the specified player is already banned.`);

                    } else if (isAdmin(player)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                    } else if (!isValidUsername(player)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${player}-aureason${reason}-auban${bannedBy}-autime${unBanISO}" -auBan 0`);
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
                            await runTellraw(p, `§aThe player §b${player}§a has been banned successfully with reason: §c${reason}\n§7* §2Time: §3${years}${months}${weeks}${days}${hours}${minutes}${seconds}`);
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
                    if (reason.trim() === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);
                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${selectedPlayer}-aureason${reason}-auban${bannedBy}-autime-aupermabanned-au" -auBan 0`);
                            try {
                                await runCmd(overworld, `kick "${selectedPlayer}" "\n§l§6----------------------------\n§l§4§k|||||§r§l§cYou have been permanently banned by §4${bannedBy}§4§k|||||§r\n§l§o§4Reason: §c${reason}\n§r§l§6----------------------------§r"`);
                            } catch (e) { }
                            await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been banned successfully with reason: §c${reason}\n§7* §2Time: §3Permanently`);
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

                    if (reason.trim() === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (result.formValues.slice(2).every(value => value === 0)) { //If all time values are 0
                        await runTellraw(p, `§cError, you must must specify a ban time.`);

                    } else if (isBanned(selectedPlayer)) {
                        await runTellraw(p, `§cError, the specified player is already banned.`);

                    } else if (isAdmin(selectedPlayer)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot ban.`);

                    } else if (!isValidUsername(selectedPlayer)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${selectedPlayer}-aureason${reason}-auban${bannedBy}-autime${unBanISO}" -auBan 0`);
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
                            await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been banned successfully with reason: §c${reason}\n§7* §2Time: §3${years}${months}${weeks}${days}${hours}${minutes}${seconds}`);
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
    form.body("Select an offline/online banned player to unban");
    form.button("<-- Back", "textures/icons/back.png");
    form.button("Type an offline/online player instead", "textures/icons/pencil.png");

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
                        await runCmd(overworld, `scoreboard players reset "${player}-aureason${reason}-auban${bannedBy}-autime${banISO}" -auBan`);
                        await runTellraw(p, `§aThe player §b${player}§a has been unbanned successfully.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't unban the player, perhaps the ban time is now over.`);
                    }
                }
            });
        } else if (response.selection > 1) {
            const selectedPlayer = bannedPlayers[response.selection - 2];

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
                        await runCmd(overworld, `scoreboard players reset "${selectedPlayer}-aureason${reason}-auban${bannedBy}-autime${banISO}" -auBan`);
                        await runTellraw(p, `§aThe player §b${selectedPlayer}§a has been unbanned successfully.`);
                    } catch (e) {
                        await runTellraw(p, `§cError, couldn't unban the player, perhaps the ban time is now over.`);
                    }
                }
            });
        }
    });
}

function jailMenu(p) {
    const form = new ActionFormData()
        .title("Jail menu")
        .body("Select an option")
        .button("<-- Back", "textures/icons/back.png") //0
        .button("Learn how to use") //1
        .button("Jail a player") //2
        .button("Unjail a player") //3
        .button("Jail location config") //4
        .button("Jail exit location config"); //5
    form.show(p).then((response) => {
        switch (response.selection) {
            case 0:
                adminCommands(p);
                break;
            case 1:

                break;
            case 2:
                jailPlayer(p);
                break;
            case 3:
                unJailPlayer(p);
                break;
            case 4:
                jailLocConfig(p);
                break;
            case 5:
                jailExitLocConfig(p);
                break;
            default:
                break;
        }
    });
}

function jailPlayer(p) {
    let playersArray = players.map(pname => pname.name);
    let locPlayers = players;

    const form = new ActionFormData()
        .title("Jail menu")
        .body("Select an online player to jail")
        .button("<-- Back", "textures/icons/back.png")
        .button("Type an offline/online player instead", "textures/icons/pencil.png");
    for (const player of playersArray) {
        if (!isJailed(player)) {
            form.button(player, "textures/icons/steve_icon.png");
        }
    }

    form.show(p).then((response) => {
        if (response.selection === 0) {
            jailMenu(p);
        } else if (response.selection === 1) {
            let form = new ModalFormData()
                .title("Jail menu")
                .textField("Type below the player you would like to jail.", "Player's name") //0
                .textField("Enter a reason:", "Reason") //1
                .toggle("Permanent jail", false) //2
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
                const isPermaJailed = result.formValues[2];
                const jailedBy = p.name;

                if (isPermaJailed === true) {

                } else {
                    const jailYears = result.formValues[3];
                    const jailMonths = result.formValues[4];
                    const jailWeeks = result.formValues[5]; //Only to calculate the respective days and add them to jailDays
                    const jailDays = result.formValues[6]; //Specified days without taking the weeks into account, include this in the kick cmd
                    const jailTotalDays = jailDays + jailWeeks * 7;
                    const jailHours = result.formValues[7];
                    const jailMinutes = result.formValues[8];
                    const jailSeconds = result.formValues[9];

                    const releaseDate = moment();
                    releaseDate.add(jailYears, 'years');
                    releaseDate.add(jailMonths, 'months');
                    releaseDate.add(jailTotalDays, 'days');
                    releaseDate.add(jailHours, 'hours');
                    releaseDate.add(jailMinutes, 'minutes');
                    releaseDate.add(jailSeconds, 'seconds');

                    const releaseISO = releaseDate.toISOString(); //Date when you will get released

                    if (reason.trim() === "") {
                        await runTellraw(p, `§cError, you must enter a reason.`);

                    } else if (result.formValues.slice(3).every(value => value === 0)) {
                        await runTellraw(p, `§cError, you must must specify a jail time.`);

                    } else if (!isValidUsername(player)) {
                        await runTellraw(p, `§cError, the username you entered is invalid.`);

                    } else if (isBanned(player)) {
                        await runTellraw(p, `§cError, the specified player is currently banned.`);

                    } else if (isJailed(player)) {
                        await runTellraw(p, `§cError, the specified player is already in jail.`);

                    } else if (isAdmin(player)) {
                        await runTellraw(p, `§cError, the specified player is an admin, cannot jail.`);

                    } else if (!isJailLocSet()) {
                        await runTellraw(p, `§cError, the location of the jail hasn't been set yet.`);

                    } else if (!isJailExitLocSet()) {
                        await runTellraw(p, `§cError, the exit location of the jail hasn't been set yet.`);

                    } else {
                        try {
                            await runCmd(overworld, `scoreboard players set "${player}-aureason${reason}-aujailedby${jailedBy}-autime${releaseISO}" -auJailed 0`);
                            const years = jailYears === 0 ? "" : jailYears === 1 ? `${jailYears} year ` : `${jailYears} years `;
                            const months = jailMonths === 0 ? "" : jailMonths === 1 ? `${jailMonths} month ` : `${jailMonths} months `;
                            const weeks = jailWeeks === 0 ? "" : jailWeeks === 1 ? `${jailWeeks} week ` : `${jailWeeks} weeks `;
                            const days = jailDays === 0 ? "" : jailDays === 1 ? `${jailDays} day ` : `${jailDays} days `;
                            const hours = jailHours === 0 ? "" : jailHours === 1 ? `${jailHours} hour ` : `${jailHours} hours `;
                            const minutes = jailMinutes === 0 ? "" : jailMinutes === 1 ? `${jailMinutes} minute ` : `${jailMinutes} minutes `;
                            const seconds = jailSeconds === 0 ? "" : jailSeconds === 1 ? `${jailSeconds} second` : `${jailSeconds} seconds`;

                            const playerRaw = world.getPlayers({ name: player })[0]; //Añadir efecto de cámara?
                            playerRaw.teleport(getJailLoc()[0], getJailLoc()[1]);
                            await runTellraw(p, `§aThe player §b${player}§a has been jailed successfully with reason: §c${reason}\n§7* §2Time: §3${years}${months}${weeks}${days}${hours}${minutes}${seconds}`);
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't jail the player.`);
                        }
                    }
                }
            });
        } else if (response.selection >= 2) {

        }
    });
}

function unJailPlayer(p) {
    const form = new ActionFormData()
        .title("Unjail menu")
}

function jailLocConfig(p) {
    const form = new ActionFormData()
        .title("Jail location config")
        .button("<-- Back", "textures/icons/back.png"); //0
    if (!isJailLocSet()) {
        form.body("You haven't set the location of the jail yet, please select an option. You can go to any dimension.")
            .button("Set jail location to current location"); //1
    } else {
        const _jailDim = getJailLoc()[1].dimension.id;
        let jailDim = '';
        if (_jailDim === "minecraft:overworld") {
            jailDim = '§bOverworld';
        } else if (_jailDim === "minecraft:nether") {
            jailDim = '§cNether';
        } else if (_jailDim === "minecraft:the_end") {
            jailDim = '§5The End';
        }

        form.body(`The location of the jail has already been set at §a${round(getJailLoc()[0].x)} ${round(getJailLoc()[0].y)} ${round(getJailLoc()[0].z)}§r, ${jailDim}§r. Select an option.`)
            .button("Teleport to jail location") //1
            .button("Set jail location to current location") //2
            .button("Remove jail location"); //3
    }
    form.show(p).then((response) => {
        if (response.canceled) return;

        const { selection } = response;
        if (selection === 0) {
            jailMenu(p);
        } else if (!isJailLocSet()) {
            if (selection === 1) {
                const _playerDim = p.dimension.id;
                let playerDim = '';
                if (_playerDim === "minecraft:overworld") {
                    playerDim = '§bOverworld';
                } else if (_playerDim === "minecraft:nether") {
                    playerDim = '§cNether';
                } else if (_playerDim === "minecraft:the_end") {
                    playerDim = '§5The End';
                }
                const currentLoc = p.location;

                const form = new MessageFormData()
                    .title("Jail location config")
                    .body(`Are you sure you want to set the location of the jail to §a${round(currentLoc.x)} ${round(currentLoc.y)} ${round(currentLoc.z)}§r, ${playerDim}§r?`)
                    .button1("No")
                    .button2("Yes");
                form.show(p).then(async result => {
                    if (result.selection === 1) {
                        if (!isJailLocSet()) { //Test this type of thing in the rest of the code!
                            try {
                                await runCmd(p, `scoreboard players set "-au${p.dimension.id.replace(/minecraft:/, '')} -au${currentLoc.x} -au${currentLoc.y} -au${currentLoc.z}" -auJailLoc 0`);
                                await runTellraw(p, `§aThe jail location has been successfully set to §b${round(currentLoc.x)} ${round(currentLoc.y)} ${round(currentLoc.z)}§a, ${playerDim}§a.`);
                            } catch (e) {
                                await runTellraw(p, `§cError, couldn't set the jail location.`);
                            }
                        } else {
                            await runTellraw(p, `§cError, the jail location has been set recently by another user.`);
                        }
                    }
                });
            }
        } else {
            if (selection === 1) {
                const _jailDim = getJailLoc()[1].dimension.id;
                let jailDim = '';
                if (_jailDim === "minecraft:overworld") {
                    jailDim = '§bOverworld';
                } else if (_jailDim === "minecraft:nether") {
                    jailDim = '§cNether';
                } else if (_jailDim === "minecraft:the_end") {
                    jailDim = '§5The End';
                }

                const form = new MessageFormData()
                    .title("Jail location config")
                    .body(`Are you sure you want to teleport to §a${round(getJailLoc()[0].x)} ${round(getJailLoc()[0].y)} ${round(getJailLoc()[0].z)}§r, ${jailDim}§r?`)
                    .button1("No")
                    .button2("Yes");
                form.show(p).then(async result => {
                    if (result.selection === 1) {
                        try {
                            await runTellraw(p, `§bTeleporting...`);
                            const delay = ticks => new Promise(res => system.runTimeout(res, ticks));
                            await delay(3 * TicksPerSecond);
                            p.teleport(getJailLoc()[0], getJailLoc()[1]);
                            await runTellraw(p, `§bTeleported!`);
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't teleport to the jail location.`);
                        }
                    }
                });
            } else if (selection === 2) {
                const _playerDim = p.dimension.id;
                let playerDim = '';
                if (_playerDim === "minecraft:overworld") {
                    playerDim = '§bOverworld';
                } else if (_playerDim === "minecraft:nether") {
                    playerDim = '§cNether';
                } else if (_playerDim === "minecraft:the_end") {
                    playerDim = '§5The End';
                }
                const currentLoc = p.location;

                const form = new MessageFormData()
                    .title("Jail location config")
                    .body(`Are you sure you want to set the location of the jail to §a${round(currentLoc.x)} ${round(currentLoc.y)} ${round(currentLoc.z)}§r, ${playerDim}§r?\nThis will override the previous location.`)
                    .button1("No")
                    .button2("Yes");
                form.show(p).then(async result => {
                    if (result.selection === 1) {
                        try {
                            const scoreboard = world.scoreboard.getObjective('-auJailLoc').getParticipants()[0]?.displayName;
                            if (!scoreboard) {
                                await runCmd(p, `scoreboard players set "-au${p.dimension.id.replace(/minecraft:/, '')} -au${currentLoc.x} -au${currentLoc.y} -au${currentLoc.z}" -auJailLoc 0`);
                                await runTellraw(p, `§aThe jail location has been successfully set to §b${round(currentLoc.x)} ${round(currentLoc.y)} ${round(currentLoc.z)}§a, ${playerDim}§a.`);
                            } else {
                                await runCmd(p, `scoreboard players reset "${scoreboard}" -auJailLoc`);
                                await runCmd(p, `scoreboard players set "-au${p.dimension.id.replace(/minecraft:/, '')} -au${currentLoc.x} -au${currentLoc.y} -au${currentLoc.z}" -auJailLoc 0`);
                                await runTellraw(p, `§aThe jail location has been successfully set to §b${round(currentLoc.x)} ${round(currentLoc.y)} ${round(currentLoc.z)}§a, ${playerDim}§a.`);
                            }
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't set the jail location.`);
                        }
                    }
                });
            } else if (selection === 3) {
                const _jailDim = getJailLoc()[1].dimension.id;
                let jailDim = '';
                if (_jailDim === "minecraft:overworld") {
                    jailDim = '§bOverworld';
                } else if (_jailDim === "minecraft:nether") {
                    jailDim = '§cNether';
                } else if (_jailDim === "minecraft:the_end") {
                    jailDim = '§5The End';
                }
                
                const form = new MessageFormData()
                    .title("Jail location config")
                    .body(`Are you sure you want to remove the current jail location (§a${round(getJailLoc()[0].x)} ${round(getJailLoc()[0].y)} ${round(getJailLoc()[0].z)}§r, ${jailDim}§r)? You won't be able to jail more players until a new location is set.`)
                    .button1("No")
                    .button2("Yes");
                form.show(p).then(async result => {
                    if (result.selection === 1) {
                        try {
                            const scoreboard = world.scoreboard.getObjective('-auJailLoc').getParticipants()[0]?.displayName;
                            if (scoreboard) {
                                await runCmd(p, `scoreboard players reset "${scoreboard}" -auJailLoc`);
                                await runTellraw(p, `§aThe jail location has been successfully removed.`);
                            } else {
                                await runTellraw(p, `§cError, the jail location has been removed recently by another user.`);
                            }
                        } catch (e) {
                            await runTellraw(p, `§cError, couldn't remove the jail location.`);
                        }
                    }
                });
            }
        }
    });
}

function jailExitLocConfig(p) {
    const form = new ActionFormData()
        .title("Jail exit location config")
}

function projectilePowers(p) {
    const form = new ActionFormData()
        .title("Projectiles powers")
        .body("Select an option")
        .button("<-- Back", "textures/icons/back.png")
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
                .button("<-- Back", "textures/icons/back.png")
                .button("Type an offline/online player instead", "textures/icons/pencil.png");
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
        .button("<-- Back", "textures/icons/back.png")
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
                    .button("<-- Back", "textures/icons/back.png")
                    .button("Type an online player instead", "textures/icons/pencil.png");
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
                                        player.addEffect(MinecraftEffectTypes.speed, 99999 * TicksPerSecond, { amplifier: 4, showParticles: false });
                                        player.addEffect(MinecraftEffectTypes.jumpBoost, 99999 * TicksPerSecond, { amplifier: 1, showParticles: false });
                                        player.addEffect(MinecraftEffectTypes.strength, 99999 * TicksPerSecond, { amplifier: 2, showParticles: false });
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
                                    player.addEffect(MinecraftEffectTypes.speed, 99999 * TicksPerSecond, { amplifier: 4, showParticles: false });
                                    player.addEffect(MinecraftEffectTypes.jumpBoost, 99999 * TicksPerSecond, { amplifier: 1, showParticles: false });
                                    player.addEffect(MinecraftEffectTypes.strength, 99999 * TicksPerSecond, { amplifier: 2, showParticles: false });
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
                    .button("<-- Back", "textures/icons/back.png")
                    .button("Type an online player instead", "textures/icons/pencil.png");
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
                                        player.addEffect(MinecraftEffectTypes.speed, 99999 * TicksPerSecond, { amplifier: 4, showParticles: false });
                                        player.addEffect(MinecraftEffectTypes.jumpBoost, 99999 * TicksPerSecond, { amplifier: 1, showParticles: false });
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
                                    player.addEffect(MinecraftEffectTypes.speed, 99999 * TicksPerSecond, { amplifier: 4, showParticles: false });
                                    player.addEffect(MinecraftEffectTypes.jumpBoost, 99999 * TicksPerSecond, { amplifier: 1, showParticles: false });
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
        return world.scoreboard.getObjective('-auBan').getParticipants().map(participant => participant.displayName.match(/^[^]+(?=-aureason)/)[0]);
    } catch (e) {
        return;
    }
}

function getBanReason(player) {
    let bannedPlayers = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auBan').getParticipants()) {
        bannedPlayers.push(bannedRawPlayer.displayName.match(/^[^]+(?=-aureason)/)[0]);
    }

    let banReasons = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auBan').getParticipants()) {
        banReasons.push(bannedRawPlayer.displayName.match(/(?<=-aureason)[^]+(?=-auban)/)[0]);
    }
    return banReasons[bannedPlayers.indexOf(player)];
}

function getBannedBy(player) {
    let bannedPlayers = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auBan').getParticipants()) {
        bannedPlayers.push(bannedRawPlayer.displayName.match(/^[^]+(?=-aureason)/)[0]);
    }

    let bannedBys = [];
    for (const bannedRawPlayer of world.scoreboard.getObjective('-auBan').getParticipants()) {
        bannedBys.push(bannedRawPlayer.displayName.match(/.*-auban([^]+)-autime/)[1]);
    }
    return bannedBys[bannedPlayers.indexOf(player)];
}

function getUnBanISO(player) {
    const bannedParticipants = world.scoreboard.getObjective('-auBan').getParticipants();
    const matchISO = new RegExp(`(?<=^${convertToRegExpFriendly(player)}-aureason.+-autime)(?!.*-auban)[^]+`);
    const scoreboard = bannedParticipants.filter(participant => matchISO.test(participant.displayName))[0].displayName;
    return scoreboard.match(matchISO)[0];
}

function isJailed(player) {
    //MisledPaul58976-aureason.....-aujailedby......-autime.....
    const jailedPlayers = world.scoreboard.getObjective('-auJailed').getParticipants();
    const regexp = new RegExp(`^${convertToRegExpFriendly(player)}(?=-aureason)`); //Revisar lo de ^ para que sea la primera palabra en las demás funciones
    if (jailedPlayers.some(player => regexp.test(player.displayName))) return true
    else return false;
}

function isJailLocSet() {
    const scoreboard = world.scoreboard.getObjective('-auJailLoc').getParticipants()[0]?.displayName;
    if (scoreboard) return true
    else return false;
}

function isJailExitLocSet() {
    const scoreboard = world.scoreboard.getObjective('-auJailExitLoc').getParticipants()[0]?.displayName;
    if (scoreboard) return true
    else return false;
}

function isPermaJailed(player) {
    if (getReleaseISO(player) === "-aupermajailed-au") return true
    else return false;
}

function isJailTimeOver(player) {
    try {
        const releaseDate = moment(getReleaseISO(player), moment.ISO_8601);
        const currentDate = moment();
        const remainingTime = moment.duration(releaseDate.diff(currentDate));
        const milliseconds = remainingTime.asMilliseconds();
        if (milliseconds <= 0) return true
        else return false;
    } catch (e) { return; }
}

function getJailedPlayers() {
    try {
        return world.scoreboard.getObjective('-auJailed').getParticipants().map(participant => participant.displayName.match(/^[^]+(?=-aureason)/)[0]);
    } catch (e) {
        return;
    }
}

function getJailReason(player) {
    const jailedParticipants = world.scoreboard.getObjective('-auJailed').getParticipants();
    const regexp = new RegExp(`^${convertToRegExpFriendly(player)}-aureason([^]+)-aujailedby.+`);
    const scoreboard = jailedParticipants.filter(participant => regexp.test(participant.displayName))[0].displayName;
    return scoreboard.match(regexp)[1];
}

function getJailedBy(player) {
    const jailedParticipants = world.scoreboard.getObjective('-auJailed').getParticipants();
    const regexp = new RegExp(`^${convertToRegExpFriendly(player)}-aureason.+-aujailedby([^]+)-autime.+`);
    const scoreboard = jailedParticipants.filter(participant => regexp.test(participant.displayName))[0].displayName;
    return scoreboard.match(regexp)[1];
}

function getReleaseISO(player) {
    const jailedParticipants = world.scoreboard.getObjective('-auJailed').getParticipants();
    const matchISO = new RegExp(`(?<=^${convertToRegExpFriendly(player)}-aureason.+-aujailedby.+-autime)(?!.*-aujailedby)[^]+`); //Also works: `^${convertToRegExpFriendly(player)}-aureason.+-aujailedby.+-autime([^]+)`
    const scoreboard = jailedParticipants.filter(participant => matchISO.test(participant.displayName))[0].displayName;
    return scoreboard.match(matchISO)[0];
}

function getJailLoc() {
    //-auoverworld -au-46.123164 -au64 -au79.01385315
    const positions = world.scoreboard.getObjective('-auJailLoc').getParticipants()[0]?.displayName.match(/-au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*)/).slice(1).map(pos => parseFloat(pos));
    const dimension = world.scoreboard.getObjective('-auJailLoc').getParticipants()[0]?.displayName.match(/(?<=-au)overworld|nether|the_end/)[0];
    if (!positions) {
        world.sendMessage('pos fail');
        return;
    } else {
        return [{ x: positions[0], y: positions[1], z: positions[2] }, { dimension: world.getDimension(dimension) }];
    }
}

function getJailExitLoc() {
    const positions = world.scoreboard.getObjective('-auJailExitLoc').getParticipants()[0]?.displayName.match(/-au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*) -au(-?[0-9]+[^]*)/).slice(1).map(pos => parseFloat(pos));
    const dimension = world.scoreboard.getObjective('-auJailExitLoc').getParticipants()[0]?.displayName.match(/(?<=-au)overworld|nether|the_end/)[0];
    if (!positions) {
        world.sendMessage('pos fail');
        return;
    } else {
        return [{ x: positions[0], y: positions[1], z: positions[2] }, { dimension: world.getDimension(dimension) }];
    }
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
        if (world.scoreboard.getObjective('-auFrozen').getParticipants().map(participant => participant.displayName.match(/-auname([^]*) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+) -au-?(?:[0-9]+[^]*|\+)/)[1]).includes(player)) return true
        else return false;
    } catch (e) { return false }
}

function convertToRegExpFriendly(str) {
    return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function round(num, decimals = 2) {
    var sign = (num >= 0 ? 1 : -1);
    num = num * sign;
    if (decimals === 0) //con 0 decimales
        return sign * Math.round(num);
    // round(x * 10 ^ decimales)
    num = num.toString().split('e');
    num = Math.round(+(num[0] + 'e' + (num[1] ? (+num[1] + decimals) : decimals)));
    // x * 10 ^ (-decimales)
    num = num.toString().split('e');
    return sign * (num[0] + 'e' + (num[1] ? (+num[1] - decimals) : -decimals));
}