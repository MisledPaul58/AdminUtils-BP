import { ActionButton, ActionForm, Dropdown, Label, ModalForm, Slider, TextField } from "../../builder";
import { Translations } from "../../../utils/translations";
import { server } from "../../../server";
import { Group } from "../../../permissions/model/group";
import { RawMessage, world } from "@minecraft/server";

export const groups: ActionForm = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Groups,
    elements: () => {
        const buttons: ActionButton[] = [
            {
                type: "button",
                text: Translations.Ui.Plugins.Permissions.CreateNewGroup,
                icon: "",
                action: (context) => {
                    context.goTo("createGroup");
                }
            } as ActionButton
        ];

        for (const group of server.permission.getGroups()) {
            const button: ActionButton = {
                type: "button",
                text: group.displayName,
                icon: "",
                subText: Translations.Ui.General.SubTextManage,
                action: (context) => {
                    context.setData("selectedGroup", group);
                    context.goTo("groupConfig");
                }
            };
            buttons.push(button);
        }

        return buttons;
    }
};

export const createGroup: ModalForm = {
    type: "modal",
    title: Translations.Ui.Plugins.Permissions.CreateNewGroup,
    elements: [
        {
            type: "textField",
            inputId: "identifier",
            name: Translations.Ui.Plugins.Permissions.Identifier,
            placeholder: "e.g. admin"
        } as TextField,
        {
            type: "textField",
            inputId: "displayName",
            name: Translations.Ui.Plugins.Permissions.DisplayName,
            placeholder: "e.g. Admin"
        } as TextField,
        {
            type: "slider",
            inputId: "weight",
            name: Translations.Ui.Plugins.Permissions.Weight,
            minimum: -100,
            maximum: 100,
            default: 0
        } as Slider,
        {
            type: "dropdown",
            inputId: "inheritsFrom",
            name: Translations.Ui.Plugins.Permissions.InheritsFrom,
            items: () => {
                const groups = Array.from(server.permission.getGroups()).map(group => group.identifier);
                if (groups[0]) {
                    // Adds a "None" option
                    groups.unshift(Translations.Ui.Plugins.Permissions.None);
                    return groups;
                }
                // If there are no groups
                return [Translations.Ui.Plugins.Permissions.NoGroups];
            }
        } as Dropdown,
        {
            type: "label",
            text: Translations.Ui.Plugins.Permissions.InheritsFromLabel
        } as Label
    ],
    submitText: Translations.Ui.Plugins.Permissions.CreateGroup,
    submit: (inputs, player, context) => {
        const { identifier, displayName, weight } = inputs;
        const inheritance = server.permission.getGroup(inputs.inheritsFrom as string);

        server.permission.createGroup(player, identifier as string, displayName as string, weight as number, inheritance instanceof Group ? [inheritance] : undefined);

        context.back();
    }
};

export const groupConfig: ActionForm = {
    type: "action",
    title: (context) => {
        return context.getData<Group>("selectedGroup")?.displayName ?? "";
    },
    elements: [
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.EditProperties,
            icon: "",
            action: (context) => {
                context.goTo("groupProperties");
            }
        } as ActionButton,
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManagePermissions,
            icon: "",
            action: (context) => {
                context.setData("selectedPHolder", context.getData("selectedGroup") as Group);
                context.goTo("managePermissions");
            }
        } as ActionButton,
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManageInheritance,
            icon: "",
            action: (context) => {
                context.setData("selectedPHolder", context.getData("selectedGroup") as Group);
                context.goTo("manageInheritance");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%plugins.permissions.deleteGroup",
            icon: "",
            action: (context, player) => {
                context.confirm(
                    context.getData<Group>("selectedGroup")?.displayName ?? "",
                    "%plugins.permissions.confirmDeleteGroup",
                    () => {
                        const selectedGroup = context.getData<Group>("selectedGroup");
                        if (selectedGroup) {
                            server.permission.deleteGroup(selectedGroup);
                            player.sendSuccess("permissions.groupDeleted", [selectedGroup.displayName]);
                        }

                        context.back(2);
                    }
                );
            }
        } as ActionButton
    ],
    buildErrorMsg: Translations.Msg.Permissions.GroupPropertiesError
};

export const groupProperties: ModalForm = {
    type: "modal",
    title: (context) => {
        return {
            translate: Translations.Ui.Plugins.Permissions.Group.PropertiesTitle,
            with: [context.getData<Group>("selectedGroup")?.displayName ?? ""]
        } as RawMessage
    },
    elements: [
        {
            type: "label",
            text: context => {
                return {
                    translate: "%plugins.permissions.group.identifierLabel",
                    with: [context.getData<Group>("selectedGroup")?.identifier ?? ""],
                } as RawMessage;
            }
        } as Label,
        {
            type: "textField",
            inputId: "displayName",
            name: Translations.Ui.Plugins.Permissions.DisplayName,
            default: context => {
                return context.getData<Group>("selectedGroup")?.displayName ?? "";
            }
        } as TextField,
        {
            type: "slider",
            inputId: "weight",
            name: Translations.Ui.Plugins.Permissions.Weight,
            minimum: -100,
            maximum: 100,
            default: context => {
                return context.getData<Group>("selectedGroup")?.weight ?? 0;
            }
        } as Slider
    ],
    submitText: Translations.Ui.General.SubmitTextSave,
    submit: (inputs, player, context) => {
        const group = context.getData<Group>("selectedGroup");
        if (group) {
            const result = server.permission.setGroupDisplayName(group, inputs.displayName as string);
            if (!result) {
                return player.sendError(Translations.Msg.Permissions.InvalidName);
            } else {
                server.permission.setGroupWeight(group, inputs.weight as number);
                player.sendSuccess(Translations.Msg.SaveSuccess);
            }
        }
        context.back();
    }
};

// export const manageGroupPermissions: ActionForm = {
//     type: "action",
//     title: context => {
//         return {
//             translate: Translations.Ui.Plugins.Permissions.Group.PermissionsTitle,
//             with: [context.getData<Group>("selectedGroup")?.displayName ?? ""]
//         } as RawMessage;
//     },
//     elements: (context) => {
//         const buttons: ActionButton[] = [
//             {
//                 type: "button",
//                 text: Translations.Ui.Plugins.Permissions.Group.AddPermission,
//                 icon: "",
//                 action: context => {
//                     context.setData("selectedPHolder", context.getData("selectedGroup") as Group);
//                     context.goTo("addPermission");
//                 }
//             } as ActionButton
//         ]
//
//         // Show all permissions
//         for (const permission of context.getData<Group>("selectedGroup")?.getPermissionNodes() ?? []) {
//             buttons.push({
//                 type: "button",
//                 text: `§l${permission.permission}`,
//                 subText: (context) => `%plugins.permissions.value: ${permission.value ? "%plugins.permissions.true" : "%plugins.permissions.false"}`,
//                 icon: "",
//                 action: (context) => {
//                     context.setData("selectedPermNode", permission);
//                     context.setData("selectedPHolder", context.getData("selectedGroup") as Group);
//                     context.goTo("editPermission");
//                 }
//             } as ActionButton);
//         }
//
//         return buttons;
//     }
// };