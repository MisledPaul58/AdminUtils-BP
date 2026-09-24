import { UiLoader } from "./uiLoader";
import { Translations } from "../utils/translations";
const mainMenu = {
    type: "action",
    title: Translations.Ui.MainMenu.Title,
    elements: [
        {
            type: "button",
            text: Translations.Ui.MainMenu.Button1Text,
            subText: Translations.Ui.General.SubTextOpen,
            icon: "textures/icons/settings1.png",
            permission: "ui.settings",
            action: (context) => {
                context.goTo("mainSettings");
            }
        },
        {
            type: "button",
            text: Translations.Ui.MainMenu.Button2Text,
            subText: Translations.Ui.General.SubTextOpen,
            icon: "textures/icons/adminUtils.png",
            permission: "ui.au",
            action: (context) => {
                context.goTo("auMain");
            }
        },
        {
            type: "button",
            text: Translations.Ui.MainMenu.Button3Text,
            subText: Translations.Ui.General.SubTextOpen,
            icon: "",
            permission: "ui.plugins",
            action: (context) => {
                context.goTo("pluginsMain");
            }
        }
    ],
    disableBackButton: true,
};
class MainMenuLoader extends UiLoader {
    uiIndex = {
        mainMenu
    };
}
export const mainMenuLoader = new MainMenuLoader();
