import { Translations } from "../../../utils/translations";
import { database } from "../../../database/index";
import { server } from "../../../server";
import { system } from "@minecraft/server";
import { PermissionNode } from "../../../permissions/permissionNode";
export const permissions = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Title,
    elements: () => {
        // Permissions enabled
        if (database.permissions.get("-auEnabled")) {
            return [
                {
                    type: "button",
                    text: Translations.Ui.General.StateEnabled,
                    subText: Translations.Ui.General.SubTextToggle,
                    icon: "",
                    action: (context) => {
                        context.confirm(Translations.Ui.Plugins.Permissions.Title, Translations.Ui.Plugins.Permissions.ConfirmDisableBody, (context) => {
                            database.permissions.set("-auEnabled", false);
                            context.back();
                        });
                    }
                },
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Groups,
                    icon: "",
                    action: (context) => {
                        context.goTo("groups");
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
                action: (context) => {
                    context.confirm(Translations.Ui.Plugins.Permissions.Title, Translations.Ui.Plugins.Permissions.ConfirmEnableBody, (context) => {
                        // Load plugin
                        system.runJob(server.permission.loadPlugin());
                        database.permissions.set("-auEnabled", true);
                        context.back();
                    });
                }
            }
        ];
    }
};
export const addPermission = {
    type: "modal",
    title: context => {
        return {
            translate: Translations.Ui.Plugins.Permissions.AddPermission,
            with: [context.getData("selectedPHolder")?.identifier ?? ""]
        };
    },
    elements: [
        {
            type: "textField",
            inputId: "permission",
            placeholder: "e.g. au.banSys.*",
            name: Translations.Ui.Plugins.Permissions.AddPermissionName
        },
        {
            type: "toggle",
            inputId: "value",
            name: Translations.Ui.Plugins.Permissions.PermissionFalseTrue,
            default: true
        },
        {
            type: "label",
            text: Translations.Ui.Plugins.Permissions.AddPermissionLabel
        },
        {
            type: "divider",
        },
        {
            type: "dropdown",
            inputId: "permissionList",
            name: Translations.Ui.Plugins.Permissions.PermissionList,
            items: context => {
                return [""];
            }
        }
    ],
    submitText: Translations.Ui.Plugins.Permissions.AddPermissionSubmit,
    submit: (inputs, player, context) => {
        const { permission, value } = inputs;
        if (!server.permission.isValidPermission(permission))
            return player.sendError(Translations.Msg.Permissions.InvalidPermission);
        const permissionHolder = context.getData("selectedPHolder");
        permissionHolder.addPermissionNode(new PermissionNode(permission, value));
        const prefixColor = value ? "§b" : "§c";
        player.sendSuccess(Translations.Msg.Permissions.AddPermSuccess, [permission, `${prefixColor}${value.toString()}`]);
        context.back();
    }
};
