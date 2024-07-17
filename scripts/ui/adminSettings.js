import { server } from "../utils/server";
import { world } from "@minecraft/server";

const register = (name, form) => server.ui.register(name, form);

register("mainSettings", {
    title: "%settings.main.title",
    buttons: [
        {
            text: "%settings.main.button1.text",
            subText: "%ui.subText.edit",
            icon: "textures/icons/settings1.png",
            action: (player) => {
                server.ui.show("config", player);
            }
        },
        {
            text: "%settings.main.button2.text",
            subText: "%ui.subText.manage",
            icon: "textures/icons/settings2.png",
            action: (player) => {
                server.ui.show("manageAdmins", player);
            }
        }
    ],
    back: "mainMenu",
    // /**
    //  *
    //  * @param { Player } player
    //  */
    // cancel: (player) => {
    //     player.dimension.spawnEntity("bee", player.location);
    //     world.sendMessage(`${server.ui.displayingUI(player)}`);
    // }
});

register("config", {
    title: "%settings.config.title",
    inputs: {
        thanksMessage: {
            type: "toggle",
            name: "%settings.config.input1.name",
            placeholder: "",
            default: (player) => {

            }
        }
    },
    cancel: (player) => {
        server.ui.show("mainSettings", player);
    }
});

register("manageAdmins", {
    title: "%settings.admins.main.title",
    body: "%settings.admins.main.body",
    buttons: [
        {
            text: "%settings.admins.main.button1.text",
            icon: "",
            action: (player) => {
                
            }
        }
    ],
    back: "mainSettings"
});

//TODO: cambiar el texto del submit button de show admins a Ok