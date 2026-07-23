import { server } from "../../../server";
export const manageInheritance = {
    type: "action",
    title: context => {
        return {
            translate: "plugins.permissions.inheritance.title",
            with: [context.getData("selectedPHolder")?.displayName ?? context.getData("selectedPHolder")?.identifier]
        };
    },
    elements: context => {
        const buttons = [
            {
                type: "button",
                text: "%plugins.permissions.inheritance.addNewParent",
                action: context => {
                    context.goTo("addParent");
                }
            }
        ];
        // Show all parents
        for (const parent of context.getData("selectedPHolder").getDirectParents()) {
            const button = {
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
export const addParent = {
    type: "modal",
    title: "%plugins.permissions.inheritance.addParentTitle",
    elements: [
        {
            type: "dropdown",
            inputId: "selectedGroup",
            name: "%plugins.permissions.inheritance.availableParents",
            items: context => {
                const currentHolder = context.getData("selectedPHolder");
                return Array.from(server.permission.getGroups()).filter(group => currentHolder.isNewParentValid(group)).map(group => group.identifier);
            }
        }
    ],
    submit: (inputs, player, context) => {
        const parent = server.permission.getGroup(inputs.selectedGroup);
        const currentHolder = context.getData("selectedPHolder");
        if (!parent) {
            context.back();
            return player.sendError("permissions.inheritance.errorFindParent");
        }
        currentHolder.addParent(parent);
        player.sendSuccess("permissions.inheritance.parentAdded", [parent.displayName, currentHolder.identifier]);
        context.back();
    },
    submitText: "%ui.submitText.add"
};
export const manageSelectedParent = {
    type: "action",
    title: context => {
        return {
            translate: "plugins.permissions.inheritance.manageParentTitle",
            with: [context.getData("selectedParent")?.identifier]
        };
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
        },
        {
            type: "button",
            text: "%plugins.permissions.inheritance.removeParent",
            action: context => {
                const parent = context.getData("selectedParent");
                const currentHolder = context.getData("selectedPHolder");
                if (!parent)
                    return context.player.sendError("permissions.inheritance.errorFindParent");
                context.confirm("%plugins.permissions.inheritance.removeParent", {
                    translate: "plugins.permissions.inheritance.confirmRemoveParent",
                    with: [parent.displayName, currentHolder.identifier]
                }, (context) => {
                    currentHolder.removeParent(parent);
                    context.player.sendSuccess("permissions.inheritance.parentRemoved", [parent.displayName, currentHolder.identifier]);
                    context.back(2);
                });
            }
        }
    ]
};
