import { Translations } from "../../../utils/translations";
import { DB } from "../../../database/databaseManager";
import { server } from "../../../server";
import { system } from "@minecraft/server";
import { PermissionNode } from "../../../permissions/model/permissionNode";
export const permissions = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Title,
    elements: () => {
        // Permissions enabled
        if (DB.Permissions.get("-auEnabled")) {
            return [
                {
                    type: "button",
                    text: Translations.Ui.General.StateEnabled,
                    subText: Translations.Ui.General.SubTextToggle,
                    icon: "",
                    permission: "ui.plugins.permissions.toggle",
                    action: (context) => {
                        context.confirm(Translations.Ui.Plugins.Permissions.Title, Translations.Ui.Plugins.Permissions.ConfirmDisableBody, (context) => {
                            DB.Permissions.set("-auEnabled", false);
                            context.back();
                        });
                    }
                },
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Groups,
                    icon: "",
                    permission: "ui.plugins.permissions.groups",
                    action: (context) => {
                        context.goTo("groups");
                    }
                },
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Users,
                    icon: "",
                    permission: "ui.plugins.permissions.users",
                    action: (context) => {
                        context.goTo("users");
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
                permission: "ui.plugins.permissions.toggle",
                action: (context) => {
                    context.confirm(Translations.Ui.Plugins.Permissions.Title, Translations.Ui.Plugins.Permissions.ConfirmEnableBody, (context) => {
                        // Load plugin
                        DB.Permissions.set("-auEnabled", true);
                        system.runJob(server.permission.loadPlugin());
                        context.back();
                    });
                }
            }
        ];
    }
};
export const managePermissions = {
    type: "action",
    title: context => {
        return {
            translate: "%plugins.permissions.generic.title",
            with: [context.getData("selectedPHolder")?.displayName ?? context.getData("selectedPHolder")?.identifier]
        };
    },
    elements: (context) => {
        const buttons = [
            {
                type: "button",
                text: "%plugins.permissions.generic.addNewPermission",
                icon: "",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.addPerm",
                action: context => {
                    context.goTo("addPermission");
                }
            }
        ];
        // Show all permissions
        for (const permission of context.getData("selectedPHolder")?.getPermissionNodes() ?? []) {
            buttons.push({
                type: "button",
                text: `§l${permission.permission}`,
                subText: (context) => `%plugins.permissions.value: ${permission.value ? "%plugins.permissions.true" : "%plugins.permissions.false"}`,
                icon: "",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.permission",
                action: (context) => {
                    context.setData("selectedPermNode", permission);
                    context.goTo("editPermission");
                }
            });
        }
        return buttons;
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
            placeholder: "e.g. ui.settings or 3",
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
            type: "label",
            text: context => {
                let list = server.permission.PERMISSIONS.map((permission, index) => {
                    return `${index + 1} ` + permission;
                }).join("\n");
                return list;
            }
        }
    ],
    submitText: Translations.Ui.Plugins.Permissions.AddPermissionSubmit,
    submit: (inputs, player, context) => {
        let permission = inputs.permission;
        const { value } = inputs;
        const index = Number(permission);
        if (!Number.isNaN(index)) {
            const selectedPerm = server.permission.PERMISSIONS[index - 1];
            if (selectedPerm)
                permission = selectedPerm;
        }
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
                type: "label",
                text: { translate: "plugins.permissions.editPermissionLabel", with: [node.permission] }
            },
            {
                type: "divider"
            },
            // Toggle value
            {
                type: "button",
                text: `§l%plugins.permissions.value:§r ${node.value ? "%plugins.permissions.true" : "%plugins.permissions.false"}`,
                subText: "%ui.subText.toggle",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.permission.toggle",
                action: context1 => {
                    try {
                        const holder = context.getData("selectedPHolder");
                        if (!holder) {
                            return context1.player.sendError("permissions.holderNotFound");
                        }
                        const removed = holder.removePermissionNode(node.permission);
                        if (!removed) {
                            return context1.player.sendError("permissions.permValChangeError");
                        }
                        const updatedNode = new PermissionNode(node.permission, !node.value);
                        holder.addPermissionNode(updatedNode);
                        context1.setData("selectedPermNode", updatedNode);
                        context1.goTo("editPermission");
                        context1.player.sendSuccess("permissions.permValChangeSuccess");
                    }
                    catch (e) {
                        console.error(e);
                        context1.player.sendError("permissions.permValChangeError");
                    }
                }
            },
            // Delete permission
            {
                type: "button",
                text: "%plugins.permissions.deletePermission",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.permission.delete",
                action: context1 => {
                    const holder = context.getData("selectedPHolder");
                    if (!holder) {
                        return context1.player.sendError("permissions.holderNotFound");
                    }
                    context1.confirm({ translate: "plugins.permissions.deletePermTitle", with: [node.permission] }, { translate: "plugins.permissions.confirmDeletePerm", with: [node.permission, holder.identifier] }, (context) => {
                        const removed = holder.removePermissionNode(node.permission);
                        if (!removed)
                            return context.player.sendError("permissions.permNotFound");
                        context.player.sendSuccess("permissions.permDeleteSuccess", [node.permission]);
                        context.back(2);
                    });
                }
            }
        ];
    }
};
