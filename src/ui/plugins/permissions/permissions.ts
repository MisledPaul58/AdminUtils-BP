import { Translations } from "../../../utils/translations";
import { DB } from "../../../database/databaseManager";
import { server } from "../../../server";
import { ActionButton, ActionForm, Divider, DynamicElement, Label, LocalizedText, ModalForm, TextField, Toggle } from "../../builder";
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
                    context.goTo("addPermissionChoice");
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

const addPermissionTitle: DynamicElement<LocalizedText> = context => ({
    translate: "%plugins.permissions.addPermission",
    with: [context.getData<PermissionHolder>("selectedPHolder")?.identifier ?? ""]
} as RawMessage);

export const addPermissionChoice: ActionForm = {
    type: "action",
    title: addPermissionTitle,
    elements: [
        {
            type: "button",
            text: "%plugins.permissions.addPermissionFromScratch",
            icon: "",
            permission: "ui.plugins.permissions.genericHolder.managePermissions.addPerm",
            action: context => {
                context.setData("pendingPermission", "");
                context.setData("addPermissionBackDepth", 2);
                context.goTo("addPermission");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%plugins.permissions.addPermissionFromList",
            icon: "",
            permission: "ui.plugins.permissions.genericHolder.managePermissions.addPerm",
            action: context => {
                context.goTo("addPermissionByIndex");
            }
        } as ActionButton
    ]
};

export const addPermissionByIndex: ModalForm = {
    type: "modal",
    title: addPermissionTitle,
    elements: [
        {
            type: "label",
            text: () => server.permission.PERMISSIONS.map((permission, index) => `${index + 1} ${permission}`).join("\n")
        } as Label,
        {
            type: "divider",
        } as Divider,
        {
            type: "textField",
            inputId: "index",
            name: "%plugins.permissions.addPermissionIndexName",
            placeholder: "e.g. 5"
        } as TextField
    ],
    submitText: "%plugins.permissions.addPermissionIndexSubmit",
    submit: (inputs, player, context) => {
        const index = Number((inputs.index as string).trim());

        if (!Number.isInteger(index) || index < 1 || index > server.permission.PERMISSIONS.length) {
            player.sendError(Translations.Msg.Permissions.InvalidPermission);
            context.goTo("addPermissionByIndex"); // Reopen so the player can try again
            return;
        }

        context.setData("pendingPermission", server.permission.PERMISSIONS[index - 1]);
        context.setData("addPermissionBackDepth", 3);
        context.goTo("addPermission");
    }
};

export const addPermission: ModalForm = {
    type: "modal",
    title: addPermissionTitle,
    elements: [
        {
            type: "textField",
            inputId: "permission",
            placeholder: "e.g. ui.settings or ui.settings.*",
            name: "%plugins.permissions.addPermissionName",
            default: context => context.getData<string>("pendingPermission") ?? ""
        } as TextField,
        {
            type: "toggle",
            inputId: "value",
            name: "%plugins.permissions.permissionFalseTrue",
            default: true
        } as Toggle,
        {
            type: "label",
            text: "%plugins.permissions.addPermissionLabel"
        } as Label
    ],
    submitText: "%plugins.permissions.addPermissionSubmit",
    submit: (inputs, player, context) => {
        const permission = inputs.permission as string;
        const { value } = inputs;

        if (!server.permission.isValidPermission(permission)) {
            player.sendError(Translations.Msg.Permissions.InvalidPermission);
            context.setData("pendingPermission", permission); // Keep the invalid input so it can be fixed
            context.goTo("addPermission"); // Reopen so the player can try again
            return;
        }

        const permissionHolder = context.getData("selectedPHolder") as PermissionHolder;
        permissionHolder.addPermissionNode(new PermissionNode(permission, value as boolean));

        const prefixColor = value ? "§b" : "§c";
        player.sendSuccess(Translations.Msg.Permissions.AddPermSuccess, [permission, `${prefixColor}${(value as boolean).toString()}`]);
        context.back(context.getData<number>("addPermissionBackDepth") ?? 2);
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