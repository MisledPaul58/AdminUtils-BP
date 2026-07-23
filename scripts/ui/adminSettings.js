import { server } from "../server";
import { database } from "../database/index";
import { UiLoader } from "./uiLoader";
import { Translations } from "../utils/translations";
const mainSettings = {
    type: "action",
    title: Translations.Ui.MainMenu.Title,
    elements: [
        {
            type: "button",
            text: "%settings.main.resetConfig",
            action: context => {
                context.confirm("%settings.main.resetConfig", "%settings.main.confirmResetConfig", (context, player) => {
                    server.resetConfig();
                    player.sendSuccess("%settings.resetConfigSuccess");
                    context.back();
                });
            }
        },
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Config,
            subText: Translations.Ui.General.SubTextEdit,
            icon: "textures/icons/settings1.png",
            action: (context) => {
                context.goTo("config");
            }
        },
        {
            type: "divider"
        },
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Database,
            subText: Translations.Ui.General.SubTextManage,
            icon: "textures/icons/settings2.png",
            action: (context, player) => {
                context.confirm("Database", "Are you sure you want to manage the database?", () => {
                    player.setOnFire(5);
                });
            }
        }
    ]
};
const config = {
    type: "modal",
    title: Translations.Ui.Settings.Config.Title,
    elements: [
        {
            type: "toggle",
            inputId: "startupMsg",
            name: Translations.Ui.Settings.Config.Input1Name,
            default: () => database.config.get("startupMsg")
        },
        {
            type: "textField",
            inputId: "adminTag",
            name: Translations.Ui.Settings.Config.Input2Name,
            placeholder: "-auadmin",
            default: () => database.config.get("adminTag")
        },
        {
            type: "textField",
            inputId: "ownerTag",
            name: Translations.Ui.Settings.Config.Input3Name,
            placeholder: "owner",
            default: () => database.config.get("ownerTag")
        }
    ],
    submitText: "%ui.submitText.save",
    submit: (inputs, player, context) => {
        database.config.assignMemory(inputs);
        player.sendSuccess("%ui.saveSuccess");
        context.back();
    }
};
const manageAdmins = {
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
        }
    ]
};
class AdminSettingsLoader extends UiLoader {
    uiIndex = {
        mainSettings,
        config,
        manageAdmins
    };
}
export const adminSettingsLoader = new AdminSettingsLoader();
