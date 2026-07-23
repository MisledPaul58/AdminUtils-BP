import { ActionButton, ActionElement, ActionForm, Divider, Label, ModalForm } from "../../builder";
import { server } from "../../../server";
import { User } from "../../../permissions/model/user";

export const users: ActionForm = {
    type: "action",
    title: "%plugins.permissions.users",
    elements: () => {
        const elements: ActionElement[] = [];
        const usersSnapshot = Array.from(server.permission.getUsers());

        const onlineUsers = usersSnapshot.filter(user => user.getPlayer());
        const offlineUsers = usersSnapshot.filter(user => !user.getPlayer());

        elements.push({
            type: "label",
            text: "%plugins.permissions.user.online"
        } as Label);

        for (const user of onlineUsers) {
            const button: ActionButton = {
                type: "button",
                text: user.identifier,
                subText: "%ui.subText.manage",
                action: context => {
                    context.setData("selectedUser", user);
                    context.goTo("userConfig");
                }
            };
            elements.push(button);
        }

        elements.push({
            type: "divider"
        } as Divider);
        elements.push({
            type: "label",
            text: "%plugins.permissions.user.offline"
        } as Label);

        for (const user of offlineUsers) {
            const button: ActionButton = {
                type: "button",
                text: user.identifier,
                subText: "%ui.subText.manage",
                action: context => {
                    context.setData("selectedUser", user);
                    context.goTo("userConfig");
                }
            };
            elements.push(button);
        }

        return elements;
    }
};

export const userConfig: ActionForm = {
    type: "action",
    title: context => {
        return context.getData<User>("selectedUser")?.identifier ?? "";
    },
    elements: [
        {
            type: "button",
            text: "%plugins.permissions.managePermissions",
            action: context => {
                context.setData("selectedPHolder", context.getData("selectedUser") as User);
                context.goTo("managePermissions")
            }
        } as ActionButton,
        {
            type: "button",
            text: "%plugins.permissions.manageInheritance",
            action: context => {
                context.setData("selectedPHolder", context.getData("selectedUser") as User);
                context.goTo("manageInheritance");
            }
        } as ActionButton
    ]
};