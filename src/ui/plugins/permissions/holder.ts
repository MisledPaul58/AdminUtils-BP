import { ActionButton, ActionForm, Dropdown, ModalForm } from "../../builder";
import { RawMessage } from "@minecraft/server";
import { Group } from "../../../permissions/model/group";
import { User } from "../../../permissions/model/user";
import { server } from "../../../server";
import { PermissionHolder } from "../../../permissions/model/permissionHolder";

export const manageInheritance: ActionForm = {
    type: "action",
    title: context => {
        return {
            translate: "plugins.permissions.inheritance.title",
            with: [context.getData<Group>("selectedPHolder")?.displayName ?? context.getData<User>("selectedPHolder")?.identifier]
        } as RawMessage;
    },
    elements: context => {
        const buttons: ActionButton[] = [
            {
                type: "button",
                text: "%plugins.permissions.inheritance.addNewParent",
                action: context => {
                    context.goTo("addParent");
                }
            } as ActionButton
        ];

        // Show all parents
        for (const parent of context.getData<Group>("selectedPHolder")!.getInheritanceTree()) {
            const button: ActionButton = {
                type: "button",
                text: parent.displayName,
                icon: "",
                action: context1 => {
                    context1.setData("selectedParent", parent);
                    context1.goTo("manageSelectedParent");
                }
            };
            buttons.push(button);
        }

        return buttons;
    }
};

export const addParent: ModalForm = {
    type: "modal",
    title: "%plugins.permissions.inheritance.addParentTitle",
    elements: [
        {
            type: "dropdown",
            inputId: "selectedGroup",
            name: "%plugins.permissions.inheritance.availableParents",
            items: context => {
                const currentHolder = context.getData<PermissionHolder>("selectedPHolder")!;
                return Array.from(server.permission.getGroups()).filter(group => group !== currentHolder && !currentHolder.isChildOf(group)).map(group => group.identifier);
            }
        } as Dropdown
    ],
    submit: (inputs, player, context) => {
        const parent = server.permission.getGroup(inputs.selectedGroup as string);
        const currentHolder = context.getData<PermissionHolder>("selectedPHolder")!;

        if (!parent) return player.sendError("permissions.inheritance.errorFindParent");
        currentHolder.addParent(parent);
        player.sendSuccess("permissions.inheritance.parentAdded", [parent.displayName, currentHolder.identifier]);

        context.back();
    },
    submitText: "%ui.submitText.add"
};

export const manageSelectedParent: ActionForm = {
    type: "action",
    title: context => {
        return {
            translate: "plugins.permissions.inheritance.manageParentTitle",
            with: [context.getData<Group>("selectedParent")?.identifier]
        } as RawMessage
    },
    elements: [
        {
            type: "button",
            text: "%plugins.permissions.inheritance.editGroup",
            action: context => {
                context.setData("selectedGroup", context.getData("selectedParent"));
                // context.back(3);
                context.goTo("groupConfig");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%plugins.permissions.inheritance.removeParent",
            action: context => {
                const parent = context.getData<Group>("selectedParent");
                const currentHolder = context.getData<PermissionHolder>("selectedPHolder")!;

                if (!parent) return context.player.sendError("permissions.inheritance.errorFindParent");

                context.confirm(
                    "%plugins.permissions.inheritance.removeParent",
                    {
                        translate: "plugins.permissions.inheritance.confirmRemoveParent",
                        with: [parent.displayName, currentHolder.identifier]
                    } as RawMessage,
                    (context) => {
                        currentHolder.removeParent(parent);
                        context.player.sendSuccess("permissions.inheritance.parentRemoved", [parent.displayName, currentHolder.identifier]);

                        context.back(2);
                    }
                );
            }
        } as ActionButton
    ]
};