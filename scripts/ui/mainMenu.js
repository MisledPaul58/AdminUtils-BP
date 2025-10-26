import { server } from "../server";
import { adminUtils } from "../main";
import { UiLoader } from "./uiLoader";
const mainMenu = {
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
        },
        {
            type: "button",
            text: "%mainMenu.button2.text",
            subText: "%ui.subText.open",
            icon: "textures/icons/adminUtils.png",
            action: (player) => {
                adminUtils(player);
            }
        },
        {
            type: "button",
            text: "%mainMenu.button3.text",
            subText: "%ui.subText.open",
            icon: "",
            action: (player) => {
                server.ui.show("pluginsMain", player);
            }
        }
    ]
};
class MainMenuLoader extends UiLoader {
    uiIndex = {
        mainMenu
    };
}
export const mainMenuLoader = new MainMenuLoader();
