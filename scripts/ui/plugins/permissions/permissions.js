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
            name: Translations.Ui.Plugins.Permissions.PermissionList, //TODO make a global list, even with the permissions you manually create
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
export const editPermission = {
    type: "action",
    title: context => {
        const node = context.getData("selectedPermNode");
        return {
            translate: "plugins.permissions.editPermission",
            with: [node?.permission ?? ""]
        };
    },
    elements: context => {
        const node = context.getData("selectedPermNode");
        if (!node)
            throw Error("The selected permission couldn't be found.");
        return [
            {
                type: "button",
                text: `§l%plugins.permissions.value:§r ${node.value ? "%plugins.permissions.true" : "%plugins.permissions.false"}`,
                subText: "%ui.subText.toggle",
                action: context1 => {
                    try {
                        const holder = context.getData("selectedPHolder");
                        if (!holder) {
                            return context1.player.sendError("a");
                        }
                        const result = holder.removePermissionNode(node.permission);
                        if (!result)
                            throw Error();
                        const newNode = new PermissionNode(node.permission, !node.value);
                        holder.addPermissionNode(newNode);
                        context1.setData("selectedPermNode", newNode);
                        context1.goTo("editPermission");
                        context1.player.sendSuccess("permissions.permValChangeSuccess");
                    }
                    catch (e) {
                        context1.player.sendError("permissions.permValChangeError");
                    }
                }
            },
            {
                type: "button",
                text: "%plugins.permissions.deletePermission",
                action: context1 => {
                }
            }
        ];
    }
};
