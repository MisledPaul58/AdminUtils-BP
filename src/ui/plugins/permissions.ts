import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
import { server } from "../../server";
import { ActionButton, ActionForm, ContextData, Form, ModalForm } from "../builder";
import { Group } from "../../permissions/model/group";
import { Player } from "@minecraft/server";

export const permissions: ActionForm = {
    title: Translations.Ui.Plugins.Permissions.Title,
    buttons: player => {
        // Permissions enabled
        if (database.permissions.get("-auEnabled")) {
            return [
                {
                    text: Translations.Ui.General.StateEnabled,
                    subText: Translations.Ui.General.SubTextToggle,
                    icon: "",
                    action: (player) => {
                        server.ui.confirm(
                            Translations.Ui.Plugins.Permissions.Title,
                            Translations.Ui.Plugins.Permissions.ConfirmDisableBody,
                            player,
                            () => {
                                database.permissions.set("-auEnabled", false);
                            },
                            () => {
                                server.ui.show("permissions", player);
                            }
                        );
                    }
                },
                {
                    text: Translations.Ui.Plugins.Permissions.Groups,
                    icon: "",
                    action: (player) => {
                        server.ui.show("groups", player);
                    }
                },
                {
                    text: Translations.Ui.Plugins.Permissions.Users,
                    icon: "",
                    action: (player) => {

                    }
                },
                {
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
                text: Translations.Ui.General.StateDisabled,
                subText: Translations.Ui.General.SubTextToggle,
                icon: "",
                action: (player) => {
                    server.ui.confirm(
                        Translations.Ui.Plugins.Permissions.Title,
                        Translations.Ui.Plugins.Permissions.ConfirmEnableBody,
                        player,
                        () => {
                            database.permissions.set("-auEnabled", true);
                        },
                        () => {
                            server.ui.show("permissions", player);
                        }
                    );
                }
            }
        ];
    },
    back: "pluginsMain"
};

export const groups: ActionForm = {
    title: Translations.Ui.Plugins.Permissions.Groups,
    buttons: (player) => {
        const buttons: ActionButton[] = [
            {
                text: Translations.Ui.Plugins.Permissions.CreateGroup,
                icon: "",
                action: player => {

                }
            }
        ];

        for (const group of server.permission.getGroups()) {
            const button: ActionButton = {
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

export const groupConfig: ActionForm = { //TODO add dividers, headers and labels?
    title: (player, contextData) => {
        return getGroupProperty("displayName", player, contextData).toString();
    },
    buttons: [
        {
            text:
        }
    ]
}

function getGroupProperty(property: keyof Group, player: Player, contextData: ContextData): string | number {
    const selectedGroup = contextData.selectedGroup;
    if (selectedGroup instanceof Group && Object.hasOwn(selectedGroup, property)) {
        const value = selectedGroup[property];
        if (typeof value === "string" || typeof value === "number") {
            return value;
        }
    }
    player.sendError(Translations.Msg.Permissions.GroupPropertiesError);
    throw "Error, the group properties couldn't be loaded.";
}