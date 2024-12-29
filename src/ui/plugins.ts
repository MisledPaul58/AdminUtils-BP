import { server } from "../server";

const register = (name, form) => server.ui.register(name, form);

register("pluginsMain", {
    title: "%pluginsMain.title",
    buttons: [
        {
            text: "%pluginsMain.buttons.ranks.text",
            subText: "%"

        }
    ]
});