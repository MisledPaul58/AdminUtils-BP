import { server } from "../server";
import { Translations } from "../utils/translations";
import { database } from "../database/index";
const register = (name, form) => server.ui.register(name, form);
register("pluginsMain", {
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
});
register("permissions", {
    title: Translations.Ui.Plugins.Permissions.Title,
    buttons: player => {
        if (database.permissions.get("-auEnabled")) { // TODO add a confirm menu for toggling the state
            return [
                {
                    text: Translations.Ui.General.StateEnabled,
                    subText: Translations.Ui.General.SubTextToggle,
                    icon: "",
                    action: (player) => {
                        server.ui.confirm(Translations.Ui.Plugins.Permissions.Title, Translations.Ui.Plugins.Permissions.ConfirmDisableBody, player, () => {
                            database.permissions.set("-auEnabled", false);
                        }, () => {
                            server.ui.show("permissions", player);
                        });
                    }
                }
            ];
        }
        return [
            {
                text: Translations.Ui.General.StateDisabled,
                subText: Translations.Ui.General.SubTextToggle,
                icon: "",
                action: (player) => {
                    server.ui.confirm(Translations.Ui.Plugins.Permissions.Title, Translations.Ui.Plugins.Permissions.ConfirmEnableBody, player, () => {
                        database.permissions.set("-auEnabled", true);
                    }, () => {
                        server.ui.show("permissions", player);
                    });
                }
            }
        ];
    },
    back: "pluginsMain"
});
