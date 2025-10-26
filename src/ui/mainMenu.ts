import { server } from "../server";
import { adminUtils } from "../main";
import { ActionButton, ActionForm, Form } from "./builder";
import { UiIndex } from "./index";
import { UiLoader } from "./uiLoader";

const mainMenu: ActionForm = {
    type: "action",
    title: "%mainMenu.title",
    elements: [
        {
            type: "button",
            text: "%mainMenu.button1.text",
            subText: "%ui.subText.open",
            icon: "textures/icons/settings1.png",
            action: (player) => {
                server.ui.show("mainSettings", player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%mainMenu.button2.text",
            subText: "%ui.subText.open",
            icon: "textures/icons/adminUtils.png",
            action: (player) => {
                adminUtils(player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%mainMenu.button3.text",
            subText: "%ui.subText.open",
            icon: "",
            action: (player) => {
                server.ui.show("pluginsMain", player);
            }
        } as ActionButton
    ]
};

class MainMenuLoader extends UiLoader {
     uiIndex: UiIndex = {
         mainMenu
     };
}

export const mainMenuLoader = new MainMenuLoader();