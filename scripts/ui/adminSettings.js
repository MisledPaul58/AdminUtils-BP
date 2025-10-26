import { server } from "../server";
import { database } from "../database/index";
import { UiLoader } from "./uiLoader";
const mainSettings = {
    type: "action",
    title: "%settings.main.title",
    elements: [
        {
            type: "button",
            text: "%settings.main.button1.text",
            subText: "%ui.subText.edit",
            icon: "textures/icons/settings1.png",
            action: (player) => {
                server.ui.show("config", player);
            }
        },
        {
            type: "button",
            text: "%settings.main.button2.text",
            subText: "%ui.subText.manage",
            icon: "textures/icons/settings2.png",
            action: (player) => {
                // server.ui.show("", player);
                server.ui.confirm("Database", "Are you sure you want to manage the database?", player, () => {
                    player.setOnFire(5);
                }, () => {
                    server.ui.show("mainSettings", player);
                });
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
};
const config = {
    type: "modal",
    title: "%settings.config.title",
    elements: [
        {
            type: "toggle",
            inputId: "thanksMessage",
            name: "%settings.config.input1.name",
            default: () => database.config.get("thanksMessage")
        },
        {
            type: "textField",
            inputId: "adminTag",
            name: "%settings.config.input2.name",
            placeholder: "-auadmin",
            default: () => database.config.get("adminTag")
        },
        {
            type: "textField",
            inputId: "ownerTag",
            name: "%settings.config.input3.name",
            placeholder: "owner",
            default: () => database.config.get("ownerTag")
        }
    ],
    submitText: "%ui.submitText.confirm",
    submit: (inputs, player) => {
        database.config.assignMemory(inputs);
        server.ui.show("mainSettings", player);
    },
    cancel: (player) => {
        server.ui.show("mainSettings", player);
    }
};
const manageAdmins = {
    type: "action",
    title: "%settings.admins.main.title",
    body: "%settings.admins.main.body",
    elements: [
        {
            type: "button",
            text: "%settings.admins.main.button1.text",
            icon: "",
            action: () => {
            }
        }
    ],
    back: "mainSettings"
};
//TODO: cambiar el texto del submit button de show admins a Ok
class AdminSettingsLoader extends UiLoader {
    uiIndex = {
        mainSettings,
        config,
        manageAdmins
    };
}
export const adminSettingsLoader = new AdminSettingsLoader();
