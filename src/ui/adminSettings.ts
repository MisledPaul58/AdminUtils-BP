import { server } from "../server";
import { database } from "../database/index";
import { ActionButton, ActionForm, Divider, Form, Label, ModalElement, ModalForm, TextField, Toggle } from "./builder";
import { UiIndex } from "./index";
import { UiLoader } from "./uiLoader";
import { Translations } from "../utils/translations";

const mainSettings: ActionForm = {
    type: "action",
    title: Translations.Ui.MainMenu.Title,
    elements: [
        {
            type: "button",
            text: "%settings.main.resetConfig",
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
            action: (context) => {
                context.goTo("config");
            }
        } as ActionButton,
        {
            type: "divider"
        } as Divider,
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Database,
            subText: Translations.Ui.General.SubTextManage,
            icon: "textures/icons/settings2.png",
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
            default: () => database.config.get("startupMsg")
        } as Toggle,
        {
            type: "textField",
            inputId: "adminTag",
            name: Translations.Ui.Settings.Config.Input2Name,
            placeholder: "-auadmin",
            default: () => database.config.get("adminTag")
        } as TextField,
        {
            type: "textField",
            inputId: "ownerTag",
            name: Translations.Ui.Settings.Config.Input3Name,
            placeholder: "owner",
            default: () => database.config.get("ownerTag")
        } as TextField
    ],
    submitText: "%ui.submitText.save",
    submit: (inputs, player, context) => {
        database.config.assignMemory(inputs);
        player.sendSuccess("%ui.saveSuccess");
        context.back();
    }
};

const manageAdmins: ActionForm = { //TODO ya no hacen falta los admins?
    type: "action",
    title: Translations.Ui.Settings.Admins.Title,
    body: Translations.Ui.Settings.Admins.Body,
    elements: [
        {
            type: "button",
            text: Translations.Ui.Settings.Admins.Button1Text,
            icon: "",
            action: () => {

            }
        } as ActionButton
    ]
};

class AdminSettingsLoader extends UiLoader {
    uiIndex: UiIndex = {
        mainSettings,
        config,
        manageAdmins
    };
}

export const adminSettingsLoader = new AdminSettingsLoader();