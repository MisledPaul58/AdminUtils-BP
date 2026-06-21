import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
const pluginsMain = {
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
        }
    ]
};
import { UiLoader } from "../uiLoader";
import { permissions, managePermissions, addPermission, editPermission } from "./permissions/permissions";
import { createGroup, groupConfig, groupProperties, groups } from "./permissions/group";
import { manageInheritance, addParent, manageSelectedParent } from "./permissions/holder";
class PluginsLoader extends UiLoader {
    uiIndex = {
        pluginsMain,
        permissions,
        managePermissions,
        addPermission,
        editPermission,
        createGroup,
        groupConfig,
        groupProperties,
        groups,
        manageInheritance,
        addParent,
        manageSelectedParent
    };
}
export const pluginsLoader = new PluginsLoader();
