import { server } from "../server";
import { database } from "../database/index";
import { ActionButton, ActionForm, Form, ModalElement, ModalForm, TextField, Toggle } from "./builder";
import { UiIndex } from "./index";
import { UiLoader } from "./uiLoader";
import { world } from "@minecraft/server";

const mainSettings: ActionForm = {
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
        } as ActionButton,
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
        } as ActionButton
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

const config: ModalForm = {
    type: "modal",
    title: "%settings.config.title",
    elements: [
        {
            type: "toggle",
            inputId: "thanksMessage",
            name: "%settings.config.input1.name",
            default: () => database.config.get("thanksMessage") as boolean
        } as Toggle,
        {
            type: "textField",
            inputId: "adminTag",
            name: "%settings.config.input2.name",
            placeholder: "-auadmin",
            default: () => database.config.get("adminTag") as string
        } as TextField,
        {
            type: "textField",
            inputId: "ownerTag",
            name: "%settings.config.input3.name",
            placeholder: "owner",
            default: () => database.config.get("ownerTag") as string
        } as TextField
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

const manageAdmins: ActionForm = {
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
        } as ActionButton
    ],
    back: "mainSettings"
};
//TODO: cambiar el texto del submit button de show admins a Ok

class AdminSettingsLoader extends UiLoader {
    uiIndex: UiIndex = {
        mainSettings,
        config,
        manageAdmins
    };
}

export const adminSettingsLoader = new AdminSettingsLoader();