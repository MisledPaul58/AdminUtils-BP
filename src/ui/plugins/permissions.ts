import { Translations } from "../../utils/translations";
import { database } from "../../database/index";
import { server } from "../../server";
import { ActionButton, ActionForm, ContextData, Dropdown, Form, Label, ModalForm, Slider, TextField } from "../builder";
import { Group } from "../../permissions/model/group";
import { RawMessage, system } from "@minecraft/server";

export const permissions: ActionForm = {
    type: "action",
    title: Translations.Ui.Plugins.Permissions.Title,
    elements: () => {
        // Permissions enabled
        if (database.permissions.get("-auEnabled")) {
            // Load plugin
            system.runJob(server.permission.loadPlugin() as Generator<void, void, void>);

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
                            database.permissions.set("-auEnabled", true);
                            context.back();
                        }
                    )
                }
            } as ActionButton
        ];
    }
};

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
        //Primer botón editar propiedades? Debajo editar herencia, permisos, etc.
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

            }
        } as ActionButton,
        {
            type: "button",
            text: Translations.Ui.Plugins.Permissions.ManageInheritance,
            icon: "",
            action: (context) => {

            }
        } as ActionButton
    ],
    buildErrorMsg: Translations.Msg.Permissions.GroupPropertiesError
};

//TODO WIP
export const groupProperties: ModalForm = {
    type: "modal",
    title: (context) => {
        return { translate: Translations.Ui.Plugins.Permissions.Group.PropertiesTitle, with: [context.getData<Group>("selectedGroup")?.displayName ?? ""] } as RawMessage
    },
    elements: [
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
                return context.getData<Group>("selectedGroup")?.weight ?? "";
            }
        } as Slider
    ],
    submitText: Translations.Ui.General.SubmitTextSave,
    submit: (inputs, player, context) => {

        context.back();
    }
};