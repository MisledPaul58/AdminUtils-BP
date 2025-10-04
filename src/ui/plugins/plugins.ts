import { server } from "../../server";
import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
import { Form } from "../builder";
import { UiIndex } from "../index";

const pluginsMain: Form = {
    title: "%pluginsMain.title",
    buttons: [
        {
            text: () => database.permissions.get("-auEnabled") ? `§l§a${Translations.Ui.Plugins.Main.PermissionsButtonText}§r` : `§c${Translations.Ui.Plugins.Main.PermissionsButtonText}§r`,
            subText: Translations.Ui.General.SubTextManage,
            icon: "",
            action: (player) => {
                server.ui.show("permissions", player);
            }
        }
    ],
    back: "mainMenu"
}

import { UiLoader } from "../uiLoader";
import { permissions, groups, groupConfig } from "./permissions";

class PluginsLoader extends UiLoader {
    uiIndex: UiIndex = {
        pluginsMain,
        permissions,
        groups,
        groupConfig
    }
}

export const pluginsLoader = new PluginsLoader();