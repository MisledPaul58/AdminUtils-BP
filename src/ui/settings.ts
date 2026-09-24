import { server } from "../server";
import { DB } from "../database/databaseManager";
import { ActionButton, ActionForm, Divider, Form, Label, ModalElement, ModalForm, TextField, Toggle } from "./builder";
import { UiIndex } from "./index";
import { UiLoader } from "./uiLoader";
import { Translations } from "../utils/translations";
import { world } from "@minecraft/server";

const mainSettings: ActionForm = {
    type: "action",
    title: Translations.Ui.MainMenu.Title,
    elements: [
        {
            type: "button",
            text: "%settings.main.resetConfig",
            permission: "ui.settings.resetConfig",
            action: context => {
                context.confirm(
                    "%settings.main.resetConfig",
                    "%settings.main.confirmResetConfig",
                    (context, player) => {
                        server.resetConfig();
                        player.sendSuccess("%settings.resetConfigSuccess");
                        context.back();
                    }
                );
            }
        } as ActionButton,
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Config,
            subText: Translations.Ui.General.SubTextEdit,
            icon: "textures/icons/settings1.png",
            permission: "ui.settings.config",
            action: (context) => {
                context.goTo("config");
            }
        } as ActionButton,
        {
            type: "divider"
        } as Divider,
        {
            type: "button",
            text: "%settings.main.admins",
            subText: "%ui.subText.manage",
            icon: "textures/icons/admin.png",
            permission: "ui.settings.admins",
            action: context => {
                context.goTo("manageAdmins");
            }
        } as ActionButton,
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Database,
            subText: Translations.Ui.General.SubTextManage,
            icon: "textures/icons/settings2.png",
            permission: "ui.settings.database",
            action: (context, player) => {
                context.confirm(
                    "Database",
                    "Are you sure you want to manage the database?",
                    () => {
                        player.setOnFire(5);
                    },
                )
            }
        } as ActionButton
    ]
};

const config: ModalForm = {
    type: "modal",
    title: Translations.Ui.Settings.Config.Title,
    elements: [
        {
            type: "toggle",
            inputId: "startupMsg",
            name: Translations.Ui.Settings.Config.Input1Name,
            default: () => DB.Config.get("startupMsg")
        } as Toggle,
        {
            type: "textField",
            inputId: "adminTag",
            name: Translations.Ui.Settings.Config.Input2Name,
            placeholder: "-auadmin",
            default: () => DB.Config.get("adminTag")
        } as TextField,
        {
            type: "textField",
            inputId: "ownerTag",
            name: Translations.Ui.Settings.Config.Input3Name,
            placeholder: "owner",
            default: () => DB.Config.get("ownerTag")
        } as TextField
    ],
    submitText: "%ui.submitText.save",
    submit: (inputs, player, context) => {
        DB.Config.assignMemory(inputs);
        player.sendSuccess("%ui.saveSuccess");
        context.back();
    }
};

const manageAdmins: ActionForm = {
    type: "action",
    title: "%settings.admins.title",
    elements: [
        {
            type: "button",
            text: "%settings.admins.add",
            icon: "textures/icons/add.png",
            action: (context) => {
                context.goTo("addAdmin");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.admins.remove",
            icon: "textures/icons/delete.png",
            action: (context) => {
                context.goTo("removeAdmin");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.admins.showAll",
            icon: "textures/icons/users.png",
            action: (context) => {
                context.goTo("showAdmins");
            }
        } as ActionButton,
    ]
};

const addAdmin: ActionForm = {
    type: "action",
    title: "%settings.admins.add",
    elements: (context) => {
        const buttons: ActionButton[] = [
            {
                type: "button",
                text: "%ui.typePlayer",
                icon: "textures/icons/pencil.png",
                action: (context) => {

                }
            } as ActionButton
        ];

        for (const player of world.getAllPlayers()) {
            if (server.isAdmin(player.name)) continue;
            buttons.push({
                type: "button",
                text: player.name,
                icon: "textures/icons/user.png",
                action: () => {
                    context.confirm();
                }
            } as ActionButton);
        }

        return buttons;
    }
};

const removeAdmin: ActionForm = {
    type: "action",
    title: "%settings.admins.remove",
    elements: (context) => {

    }
};

const showAdmins: ActionForm = {
    type: "action",
    title: "%settings.admins.showAll",
    elements: (context) => {

    }
};

class SettingsLoader extends UiLoader {
    uiIndex: UiIndex = {
        mainSettings,
        config,
        manageAdmins,
        addAdmin,
        removeAdmin,
        showAdmins
    };
}

export const settingsLoader = new SettingsLoader();