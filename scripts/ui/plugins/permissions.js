import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
import { server } from "../../server";
export const permissions = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Title,
    elements: player => {
        // Permissions enabled
        if (database.permissions.get("-auEnabled")) {
            return [
                {
                    type: "button",
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
                },
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Groups,
                    icon: "",
                    action: (player) => {
                        server.ui.show("groups", player);
                    }
                },
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Users,
                    icon: "",
                    action: (player) => {
                    }
                },
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Permissions,
                    icon: "",
                    action: (player) => {
                    }
                }
            ];
        }
        // Permissions disabled
        return [
            {
                type: "button",
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
};
export const groups = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Groups,
    elements: (player) => {
        const buttons = [
            {
                type: "button",
                text: Translations.Ui.Plugins.Permissions.CreateNewGroup,
                icon: "",
                action: player => {
                    server.ui.show("createGroup", player);
                }
            }
        ];
        for (const group of server.permission.getGroups()) {
            const button = {
                type: "button",
                text: group.displayName,
                icon: "",
                subText: Translations.Ui.General.SubTextManage,
                action: (player) => {
                    server.ui.show();
                }
            };
            buttons.push(button);
        }
        return buttons;
    },
    back: "permissions"
};
export const createGroup = {
    type: "modal",
    title: Translations.Ui.Plugins.Permissions.CreateNewGroup,
    elements: [
        {
            type: "textField",
            inputId: "identifier",
            name: Translations.Ui.Plugins.Permissions.Identifier,
            placeholder: "e.g. admin"
        },
        {
            type: "textField",
            inputId: "displayName",
            name: Translations.Ui.Plugins.Permissions.DisplayName,
            placeholder: "e.g. Admin"
        },
        {
            type: "slider",
            inputId: "weight",
            name: Translations.Ui.Plugins.Permissions.Weight,
            minimum: -100,
            maximum: 100,
            default: 0
        },
        {
            type: "dropdown",
            inputId: "inheritsFrom",
            name: Translations.Ui.Plugins.Permissions.InheritsFrom,
            items: player => {
            }
        }
    ],
    submitText: Translations.Ui.Plugins.Permissions.CreateGroup,
    submit: (inputs, player, contextData) => {
    },
    cancel: player => {
        server.ui.show("groups", player);
    }
};
export const groupConfig = {
    type: "action",
    title: (player, contextData) => {
        const selectedGroup = contextData.selectedGroup;
        return selectedGroup.displayName;
    },
    elements: [
        //Primer botón editar propiedades? Debajo editar herencia, permisos, etc.
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.EditProperties,
            icon: "",
            action: (player, contextData) => {
            }
        },
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManagePermissions,
            icon: "",
            action: (player, contextData) => {
            }
        },
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManageInheritance,
            icon: "",
            action: (player, contextData) => {
            }
        }
    ],
    back: "groups",
    buildErrorMsg: Translations.Msg.Permissions.GroupPropertiesError
};
// function getGroupProperty(property: keyof Group, player: Player, contextData: ContextData): string | number {
//     const selectedGroup = contextData.selectedGroup;
//     if (selectedGroup instanceof Group && Object.hasOwn(selectedGroup, property)) {
//         const value = selectedGroup[property];
//         if (typeof value === "string" || typeof value === "number") {
//             return value;
//         }
//     }
//     player.sendError(Translations.Msg.Permissions.GroupPropertiesError);
//     throw "Error, the group properties couldn't be loaded.";
// }
