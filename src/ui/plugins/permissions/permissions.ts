import { Translations } from "../../../utils/translations";
import { DB } from "../../../database/databaseManager";
import { server } from "../../../server";
import { ActionButton, ActionForm, Divider, Dropdown, Label, ModalForm, TextField, Toggle } from "../../builder";
import { RawMessage, system } from "@minecraft/server";
import { PermissionHolder } from "../../../permissions/model/permissionHolder";
import { PermissionNode } from "../../../permissions/model/permissionNode";
import { Group } from "../../../permissions/model/group";
import { User } from "../../../permissions/model/user";

export const permissions: ActionForm = {
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
                        context.confirm(Translations.Ui.Plugins.Permissions.Title,
                            Translations.Ui.Plugins.Permissions.ConfirmDisableBody,
                            (context) => {
                                DB.Permissions.set("-auEnabled", false);
                                context.back();
                            }
                        );
                    }
                } as ActionButton,
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Groups,
                    icon: "",
                    permission: "ui.plugins.permissions.groups",
                    action: (context) => {
                        context.goTo("groups");
                    }
                } as ActionButton,
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Users,
                    icon: "",
                    permission: "ui.plugins.permissions.users",
                    action: (context) => {
                        context.goTo("users");
                    }
                } as ActionButton,
                { //TODO make this a list to see all the permissions
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Permissions,
                    icon: "",
                    action: (player) => {

                    }
                } as ActionButton
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
                    context.confirm(
                        Translations.Ui.Plugins.Permissions.Title,
                        Translations.Ui.Plugins.Permissions.ConfirmEnableBody,
                        (context) => {
                            // Load plugin
                            DB.Permissions.set("-auEnabled", true);
                            system.runJob(server.permission.loadPlugin() as Generator<void, void, void>);

                            context.back();
                        }
                    )
                }
            } as ActionButton
        ];
    }
};

export const managePermissions: ActionForm = {
    type: "action",
    title: context => {
        return {
            translate: "%plugins.permissions.generic.title",
            with: [context.getData<Group>("selectedPHolder")?.displayName ?? context.getData<User>("selectedPHolder")?.identifier]
        } as RawMessage;
    },
    elements: (context) => {
        const buttons: ActionButton[] = [
            {
                type: "button",
                text: "%plugins.permissions.generic.addNewPermission",
                icon: "",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.addPerm",
                action: context => {
                    context.goTo("addPermission");
                }
            } as ActionButton
        ]

        // Show all permissions
        for (const permission of context.getData<PermissionHolder>("selectedPHolder")?.getPermissionNodes() ?? []) {
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
            } as ActionButton);
        }

        return buttons;
    }
};

export const addPermission: ModalForm = { // TODO actually make it so that you can choose a permission from the list, without wildcards of course
    type: "modal",
    title: context => {
        return {
            translate: Translations.Ui.Plugins.Permissions.AddPermission,
            with: [context.getData<PermissionHolder>("selectedPHolder")?.identifier ?? ""]
        } as RawMessage;
    },
    elements: [
        {
            type: "textField",
            inputId: "permission",
            placeholder: "e.g. ui.settings or 3",
            name: Translations.Ui.Plugins.Permissions.AddPermissionName
        } as TextField,
        {
            type: "toggle",
            inputId: "value",
            name: Translations.Ui.Plugins.Permissions.PermissionFalseTrue,
            default: true
        } as Toggle,
        {
            type: "label",
            text: Translations.Ui.Plugins.Permissions.AddPermissionLabel
        } as Label,
        {
            type: "divider",
        } as Divider,
        {
            type: "label",
            text: context => {
                let list: string = server.permission.PERMISSIONS.map((permission, index) => {
                    return `${index + 1} ` + permission;
                }).join("\n");
                return list;
            }
        } as Label
    ],
    submitText: Translations.Ui.Plugins.Permissions.AddPermissionSubmit,
    submit: (inputs, player, context) => { //TODO make it so that you can choose the permission with its index
        let permission = inputs.permission as string;
        const { value } = inputs;

        const index = Number(permission);
        if (!Number.isNaN(index)) {
            const selectedPerm = server.permission.PERMISSIONS[index - 1];
            if (selectedPerm) permission = selectedPerm;
        }

        if (!server.permission.isValidPermission(permission))
            return player.sendError(Translations.Msg.Permissions.InvalidPermission);

        const permissionHolder = context.getData("selectedPHolder") as PermissionHolder;
        permissionHolder.addPermissionNode(new PermissionNode(permission, value as boolean));

        const prefixColor = value ? "§b" : "§c";
        player.sendSuccess(Translations.Msg.Permissions.AddPermSuccess, [permission, `${prefixColor}${(value as boolean).toString()}`]);
        context.back();
    }
};

export const editPermission: ActionForm = {
    type: "action",
    title: context => {
        const node = context.getData<PermissionNode>("selectedPermNode");
        return {
            translate: "plugins.permissions.editPermission",
            with: [node?.permission ?? ""]
        } as RawMessage;
    },
    elements: context => {
        const node = context.getData<PermissionNode>("selectedPermNode");
        if (!node) throw Error("The selected permission couldn't be found.");

        return [
            {
                type: "label",
                text: { translate: "plugins.permissions.editPermissionLabel", with: [node.permission] } as RawMessage
            } as Label,
            {
                type: "divider"
            } as Divider,
            // Toggle value
            {
                type: "button",
                text: `§l%plugins.permissions.value:§r ${node.value ? "%plugins.permissions.true" : "%plugins.permissions.false"}`,
                subText: "%ui.subText.toggle",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.permission.toggle",
                action: context1 => {
                    try {
                        const holder = context.getData<PermissionHolder>("selectedPHolder");
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
                    } catch (e) {
                        console.error(e);
                        context1.player.sendError("permissions.permValChangeError");
                    }
                }
            } as ActionButton,
            // Delete permission
            {
                type: "button",
                text: "%plugins.permissions.deletePermission",
                permission: "ui.plugins.permissions.genericHolder.managePermissions.permission.delete",
                action: context1 => {
                    const holder = context.getData<PermissionHolder>("selectedPHolder");
                    if (!holder) {
                        return context1.player.sendError("permissions.holderNotFound");
                    }

                    context1.confirm(
                        { translate: "plugins.permissions.deletePermTitle", with: [node.permission] } as RawMessage,
                        { translate: "plugins.permissions.confirmDeletePerm", with: [node.permission, holder.identifier] } as RawMessage,
                        (context) => {
                            const removed = holder.removePermissionNode(node.permission);
                            if (!removed) return context.player.sendError("permissions.permNotFound");

                            context.player.sendSuccess("permissions.permDeleteSuccess", [node.permission]);
                            context.back(2);
                        }
                    );
                }
            } as ActionButton
        ];
    }
};