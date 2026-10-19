import { server } from "../server";
import { DB } from "../database/databaseManager";
import { ActionButton, ActionForm, Divider, Form, Label, ModalElement, ModalForm, TextField, Toggle } from "./builder";
import { UiIndex } from "./index";
import { UiLoader } from "./uiLoader";
import { Translations } from "../utils/translations";
import { RawMessage, world } from "@minecraft/server";

const mainSettings: ActionForm = {
    type: "action",
    title: Translations.Ui.MainMenu.Title,
    elements: [
        {
            type: "button",
            text: "%settings.resetConfig",
            permission: "ui.settings.resetConfig",
            action: context => {
                context.confirm(
                    "%settings.resetConfig",
                    "%settings.confirmResetConfig",
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
            text: "%settings.config",
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
            text: "%settings.admins",
            subText: "%ui.subText.manage",
            icon: "textures/icons/admin.png",
            permission: "ui.settings.admins",
            action: context => {
                context.goTo("manageAdmins");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.database",
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
            permission: "ui.settings.admins.add",
            action: (context) => {
                context.goTo("addAdmin");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.admins.remove",
            icon: "textures/icons/delete.png",
            permission: "ui.settings.admins.remove",
            action: (context) => {
                context.goTo("removeAdmin");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.admins.see",
            icon: "textures/icons/users.png",
            permission: "ui.settings.admins.see",
            action: (context) => {
                context.goTo("seeAdmins");
            }
        } as ActionButton,
    ]
};

const addAdmin: ActionForm = {
    type: "action",
    title: "%settings.admins.add",
    elements: (context) => {
        function addPlayerAsAdmin(player: string): void {
            if (server.isAdmin(player)) {
                return context.player.sendError("settings.alreadyAdmin", [player]);
            }

            DB.Server.set("admins", [...server.getAdmins(), player]);
            context.player.sendSuccess("settings.addAdminSuccess", [player]);
        }

        const buttons: ActionButton[] = [
            {
                type: "button",
                text: "%ui.typePlayer",
                icon: "textures/icons/pencil.png",
                permission: "ui.settings.admins.add",
                action: (context) => {
                    context.typePlayer("settings.admins.add", (player) => {
                        if (!server.isValidUsername(player)) {
                            return context.player.sendError("ui.invalidUsername");
                        }

                        addPlayerAsAdmin(player);
                        context.back();
                    });
                }
            } as ActionButton
        ];

        for (const player of world.getAllPlayers()) {
            if (server.isAdmin(player.name)) continue;
            buttons.push({
                type: "button",
                text: player.name,
                icon: "textures/icons/steve_icon.png",
                permission: "ui.settings.admins.add",
                action: (context) => {
                    context.confirm(
                        "%settings.admins.add",
                        { translate: "settings.admins.add.confirm", with: [player.name] } as RawMessage,
                        () => {
                            addPlayerAsAdmin(player.name);
                            context.back();
                        }
                    );
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
        function removeAdmin(player: string): void {
            if (!server.isAdmin(player)) {
                return context.player.sendError("settings.notAdmin", [player]);
            }

            const admins: string[] = server.getAdmins().filter(admin => admin !== player);
            DB.Server.set("admins", admins);

            context.player.sendSuccess("settings.removeAdminSuccess", [player]);
        }

        const buttons: ActionButton[] = [
            {
                type: "button",
                text: "%ui.typePlayer",
                icon: "textures/icons/pencil.png",
                permission: "ui.settings.admins.remove",
                action: (context) => {
                    context.typePlayer("settings.admins.remove", (player) => {
                        if (!server.isValidUsername(player)) {
                            return context.player.sendError("ui.invalidUsername");
                        }

                        removeAdmin(player);
                        context.back();
                    });
                }
            } as ActionButton
        ];

        for (const player of server.getAdmins()) {
            buttons.push({
                type: "button",
                text: player,
                icon: "textures/icons/steve_icon.png",
                permission: "ui.settings.admins.remove",
                action: (context) => {
                    context.confirm(
                        "%settings.admins.remove",
                        { translate: "settings.admins.remove.confirm", with: [player] } as RawMessage,
                        () => {
                            removeAdmin(player);
                            context.back();
                        }
                    );
                }
            } as ActionButton);
        }

        return buttons;
    }
};

const seeAdmins: ActionForm = {
    type: "action",
    title: "%settings.admins.see",
    elements: () => {
        const buttons: ActionButton[] = [];
        for (const admin of server.getAdmins()) {
            buttons.push({
                type: "button",
                text: admin,
                icon: "textures/icons/steve_icon.png",
                permission: "ui.settings.admins.see",
                action: (context) => {
                    context.goTo("seeAdmins");
                }
            } as ActionButton);
        }

        return buttons;
    }
};

class SettingsLoader extends UiLoader {
    uiIndex: UiIndex = {
        mainSettings,
        config,
        manageAdmins,
        addAdmin,
        removeAdmin,
        seeAdmins
    };
}

export const settingsLoader = new SettingsLoader();
