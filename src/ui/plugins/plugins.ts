import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
import { ActionButton, ActionForm, Form } from "../builder";
import { UiIndex } from "../index";

const pluginsMain: ActionForm = {
    type: "action",
    title: Translations.Ui.Plugins.Main.Title,
    elements: [
        {
            type: "button",
            text: () => database.permissions.get("-auEnabled") ? `§l§a${Translations.Ui.Plugins.Main.PermissionsButtonText}§r` : `§c${Translations.Ui.Plugins.Main.PermissionsButtonText}§r`,
            subText: Translations.Ui.General.SubTextManage,
            icon: "",
            action: (context) => {
                context.goTo("permissions");
            }
        } as ActionButton
    ]
}

import { UiLoader } from "../uiLoader";
import { permissions, addPermission, editPermission } from "./permissions/permissions";
import { createGroup, groupConfig, groupProperties, groups, manageGroupPermissions } from "./permissions/group";

class PluginsLoader extends UiLoader {
    uiIndex: UiIndex = {
        pluginsMain,
        permissions,
        addPermission,
        editPermission,
        createGroup,
        groupConfig,
        groupProperties,
        groups,
        manageGroupPermissions
    }
}

export const pluginsLoader = new PluginsLoader();