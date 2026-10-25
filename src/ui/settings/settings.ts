import { server } from "../../server";
import { DB } from "../../database/databaseManager";
import {
    ActionButton,
    ActionForm,
    Divider,
    ModalForm,
    TextField,
    Toggle
} from "../builder";
import { UiIndex } from "../index";
import { UiLoader } from "../uiLoader";
import { Translations } from "../../utils/translations";
import { addAdmin, manageAdmins, removeAdmin, seeAdmins } from "./admins";
import { manageDatabases } from "./database";

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
            text: "%settings.databases",
            subText: Translations.Ui.General.SubTextManage,
            icon: "textures/icons/database.png",
            permission: "ui.settings.databases",
            action: (context) => {
                context.goTo("manageDatabases");
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

class SettingsLoader extends UiLoader {
    uiIndex: UiIndex = {
        mainSettings,
        config,
        manageAdmins,
        addAdmin,
        removeAdmin,
        seeAdmins,
        manageDatabases
    };
}

export const settingsLoader = new SettingsLoader();
