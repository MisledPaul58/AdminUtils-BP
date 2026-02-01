import { database } from "../database/index";
import { UiLoader } from "./uiLoader";
import { Translations } from "../utils/translations";
const mainSettings = {
    type: "action",
    title: Translations.Ui.MainMenu.Title,
    elements: [
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Button1Text,
            subText: Translations.Ui.General.SubTextEdit,
            icon: "textures/icons/settings1.png",
            action: (context) => {
                context.goTo("config");
            }
        },
        {
            type: "button",
            text: Translations.Ui.Settings.Main.Button2Text,
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
            inputId: "thanksMessage",
            name: Translations.Ui.Settings.Config.Input1Name,
            default: () => database.config.get("thanksMessage") ?? true
        },
        {
            type: "textField",
            inputId: "adminTag",
            name: Translations.Ui.Settings.Config.Input2Name,
            placeholder: "-auadmin",
            default: () => database.config.get("adminTag") ?? "-auadmin"
        },
        {
            type: "textField",
            inputId: "ownerTag",
            name: Translations.Ui.Settings.Config.Input3Name,
            placeholder: "owner",
            default: () => database.config.get("ownerTag") ?? "owner"
        }
    ],
    submitText: Translations.Ui.General.SubmitTextConfirm,
    submit: (inputs) => {
        database.config.assignMemory(inputs);
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
//TODO: cambiar el texto del submit button de show admins a Ok
class AdminSettingsLoader extends UiLoader {
    uiIndex = {
        mainSettings,
        config,
        manageAdmins
    };
}
export const adminSettingsLoader = new AdminSettingsLoader();
