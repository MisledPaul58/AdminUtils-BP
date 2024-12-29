import { server } from "../server";
import { adminUtils } from "../main";
const register = (name, form) => server.ui.register(name, form);
register("mainMenu", {
    title: "%mainMenu.title",
    buttons: [
        {
            text: "%mainMenu.button1.text",
            subText: "%ui.subText.open",
            icon: "textures/icons/settings1.png",
            action: (player) => {
                server.ui.show("mainSettings", player);
            }
        },
        {
            text: "%mainMenu.button2.text",
            subText: "%ui.subText.open",
            icon: "textures/icons/adminUtils.png",
            action: (player) => {
                adminUtils(player);
            }
        },
        {
            text: "%mainMenu.button3.text",
            subText: "%ui.subText.open",
            icon: "",
            action: (player) => {
                server.ui.show("pluginsMain", player);
            }
        }
    ],
});
