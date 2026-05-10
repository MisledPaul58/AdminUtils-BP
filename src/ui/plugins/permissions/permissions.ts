import { Translations } from "../../../utils/translations";
import { database } from "../../../database/index";
import { server } from "../../../server";
import { ActionButton, ActionForm, Divider, Dropdown, Label, ModalForm, TextField, Toggle } from "../../builder";
import { RawMessage, system } from "@minecraft/server";
import { PermissionHolder } from "../../../permissions/model/permissionHolder";
import { PermissionNode } from "../../../permissions/permissionNode";

export const permissions: ActionForm = {
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
                        context.confirm(Translations.Ui.Plugins.Permissions.Title,
                            Translations.Ui.Plugins.Permissions.ConfirmDisableBody,
                            (context) => {
                                database.permissions.set("-auEnabled", false);
                                context.back();
                            }
                        );
                    }
                } as ActionButton,
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Groups,
                    icon: "",
                    action: (context) => {
                        context.goTo("groups");
                    }
                } as ActionButton,
                {
                    type: "button",
                    text: Translations.Ui.Plugins.Permissions.Users,
                    icon: "",
                    action: (player) => {

                    }
                } as ActionButton,
                {
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
                action: (context) => {
                    context.confirm(
                        Translations.Ui.Plugins.Permissions.Title,
                        Translations.Ui.Plugins.Permissions.ConfirmEnableBody,
                        (context) => {
                            // Load plugin
                            system.runJob(server.permission.loadPlugin() as Generator<void, void, void>);

                            database.permissions.set("-auEnabled", true);
                            context.back();
                        }
                    )
                }
            } as ActionButton
        ];
    }
};

export const addPermission: ModalForm = {
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
            placeholder: "e.g. au.banSys.*",
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
            type: "dropdown",
            inputId: "permissionList",
            name: Translations.Ui.Plugins.Permissions.PermissionList, //TODO make a global list, even with the permissions you manually create
            items: context => {
                return [""];
            }
        } as Dropdown
    ],
    submitText: Translations.Ui.Plugins.Permissions.AddPermissionSubmit,
    submit: (inputs, player, context) => {
        const { permission, value } = inputs;
        if (!server.permission.isValidPermission(permission as string))
            return player.sendError(Translations.Msg.Permissions.InvalidPermission);

        const permissionHolder = context.getData("selectedPHolder") as PermissionHolder;
        permissionHolder.addPermissionNode(new PermissionNode(permission as string, value as boolean));

        const prefixColor = value ? "§b" : "§c";
        player.sendSuccess(Translations.Msg.Permissions.AddPermSuccess, [permission as string, `${prefixColor}${(value as boolean).toString()}`]);
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
                type: "button",
                text: `§l%plugins.permissions.value:§r ${node.value ? "%plugins.permissions.true" : "%plugins.permissions.false"}`,
                subText: "%ui.subText.toggle",
                action: context1 => {
                    try {
                        const holder = context.getData<PermissionHolder>("selectedPHolder");
                        if (!holder) {
                            return context1.player.sendError("a");
                        }

                        const result = holder.removePermissionNode(node.permission);
                        if (!result) throw Error();

                        const newNode = new PermissionNode(node.permission, !node.value);
                        holder.addPermissionNode(newNode);

                        context1.setData("selectedPermNode", newNode);
                        context1.goTo("editPermission");

                        context1.player.sendSuccess("permissions.permValChangeSuccess");
                    } catch (e) {
                        context1.player.sendError("permissions.permValChangeError");
                    }
                }
            } as ActionButton,
            {
                type: "button",
                text: "%plugins.permissions.deletePermission",
                action: context1 => {

                }
            } as ActionButton
        ];
    }
};