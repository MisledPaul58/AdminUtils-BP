import { server } from "../../server";
import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
const pluginsMain = {
    type: "action",
    title: "%pluginsMain.title",
    elements: [
        {
            type: "button",
            text: () => database.permissions.get("-auEnabled") ? `§l§a${Translations.Ui.Plugins.Main.PermissionsButtonText}§r` : `§c${Translations.Ui.Plugins.Main.PermissionsButtonText}§r`,
            subText: Translations.Ui.General.SubTextManage,
            icon: "",
            action: (player) => {
                server.ui.show("permissions", player);
            }
        }
    ],
    back: "mainMenu"
};
import { UiLoader } from "../uiLoader";
import { permissions, groups, createGroup, groupConfig } from "./permissions";
class PluginsLoader extends UiLoader {
    uiIndex = {
        pluginsMain,
        permissions,
        groups,
        createGroup,
        groupConfig
    };
}
export const pluginsLoader = new PluginsLoader();
