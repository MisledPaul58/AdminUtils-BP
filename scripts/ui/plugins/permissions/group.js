import { Translations } from "../../../utils/translations";
import { server } from "../../../server";
import { Group } from "../../../permissions/model/group";
export const groups = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Groups,
    elements: () => {
        const buttons = [
            {
                type: "button",
                text: Translations.Ui.Plugins.Permissions.CreateNewGroup,
                icon: "",
                permission: "ui.plugins.permissions.groups.createNew",
                action: (context) => {
                    context.goTo("createGroup");
                }
            }
        ];
        for (const group of server.permission.getGroups()) {
            const button = {
                type: "button",
                text: group.displayName,
                icon: "",
                subText: Translations.Ui.General.SubTextManage,
                permission: "ui.plugins.permissions.groups.manageGroups",
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
        },
        {
            type: "label",
            text: Translations.Ui.Plugins.Permissions.InheritsFromLabel
        }
    ],
    submitText: Translations.Ui.Plugins.Permissions.CreateGroup,
    submit: (inputs, player, context) => {
        const { identifier, displayName, weight } = inputs;
        const inheritance = server.permission.getGroup(inputs.inheritsFrom);
        server.permission.createGroup(player, identifier, displayName, weight, inheritance instanceof Group ? [inheritance] : undefined);
        context.back();
    }
};
export const groupConfig = {
    type: "action",
    title: (context) => {
        return context.getData("selectedGroup")?.displayName ?? "";
    },
    elements: [
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.EditProperties,
            icon: "",
            permission: "ui.plugins.permissions.groups.manageGroups.editProperties",
            action: (context) => {
                context.goTo("groupProperties");
            }
        },
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManagePermissions,
            icon: "",
            permission: "ui.plugins.permissions.groups.manageGroups.managePermissions",
            action: (context) => {
                context.setData("selectedPHolder", context.getData("selectedGroup"));
                context.goTo("managePermissions");
            }
        },
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManageInheritance,
            icon: "",
            permission: "ui.plugins.permissions.groups.manageGroups.manageInheritance",
            action: (context) => {
                context.setData("selectedPHolder", context.getData("selectedGroup"));
                context.goTo("manageInheritance");
            }
        },
        {
            type: "button",
            text: "%plugins.permissions.deleteGroup",
            icon: "",
            permission: "ui.plugins.permissions.groups.manageGroups.deleteGroup",
            action: (context, player) => {
                context.confirm(context.getData("selectedGroup")?.displayName ?? "", "%plugins.permissions.confirmDeleteGroup", () => {
                    const selectedGroup = context.getData("selectedGroup");
                    if (selectedGroup) {
                        server.permission.deleteGroup(selectedGroup);
                        player.sendSuccess("permissions.groupDeleted", [selectedGroup.displayName]);
                    }
                    context.back(2);
                });
            }
        }
    ],
    buildErrorMsg: Translations.Msg.Permissions.GroupPropertiesError
};
export const groupProperties = {
    type: "modal",
    title: (context) => {
        return {
            translate: Translations.Ui.Plugins.Permissions.Group.PropertiesTitle,
            with: [context.getData("selectedGroup")?.displayName ?? ""]
        };
    },
    elements: [
        {
            type: "label",
            text: context => {
                return {
                    translate: "%plugins.permissions.group.identifierLabel",
                    with: [context.getData("selectedGroup")?.identifier ?? ""],
                };
            }
        },
        {
            type: "textField",
            inputId: "displayName",
            name: Translations.Ui.Plugins.Permissions.DisplayName,
            default: context => {
                return context.getData("selectedGroup")?.displayName ?? "";
            }
        },
        {
            type: "slider",
            inputId: "weight",
            name: Translations.Ui.Plugins.Permissions.Weight,
            minimum: -100,
            maximum: 100,
            default: context => {
                return context.getData("selectedGroup")?.weight ?? 0;
            }
        }
    ],
    submitText: Translations.Ui.General.SubmitTextSave,
    submit: (inputs, player, context) => {
        const group = context.getData("selectedGroup");
        if (group) {
            const result = server.permission.setGroupDisplayName(group, inputs.displayName);
            if (!result) {
                return player.sendError(Translations.Msg.Permissions.InvalidName);
            }
            else {
                server.permission.setGroupWeight(group, inputs.weight);
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
