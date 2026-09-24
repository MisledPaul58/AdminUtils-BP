import { server } from "../../../server";
export const users = {
    type: "action",
    title: "%plugins.permissions.users",
    elements: () => {
        const elements = [];
        const usersSnapshot = Array.from(server.permission.getUsers());
        const onlineUsers = usersSnapshot.filter(user => user.getPlayer());
        const offlineUsers = usersSnapshot.filter(user => !user.getPlayer());
        elements.push({
            type: "label",
            text: "%plugins.permissions.user.online"
        });
        for (const user of onlineUsers) {
            const button = {
                type: "button",
                text: user.identifier,
                subText: "%ui.subText.manage",
                permission: "ui.plugins.permissions.users.manageUsers",
                action: context => {
                    context.setData("selectedUser", user);
                    context.goTo("userConfig");
                }
            };
            elements.push(button);
        }
        elements.push({
            type: "divider"
        });
        elements.push({
            type: "label",
            text: "%plugins.permissions.user.offline"
        });
        for (const user of offlineUsers) {
            const button = {
                type: "button",
                text: user.identifier,
                subText: "%ui.subText.manage",
                permission: "ui.plugins.permissions.users.manageUsers",
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
export const userConfig = {
    type: "action",
    title: context => {
        return context.getData("selectedUser")?.identifier ?? "";
    },
    elements: [
        {
            type: "button",
            text: "%plugins.permissions.managePermissions",
            permission: "ui.plugins.permissions.users.manageUsers.managePermissions",
            action: context => {
                context.setData("selectedPHolder", context.getData("selectedUser"));
                context.goTo("managePermissions");
            }
        },
        {
            type: "button",
            text: "%plugins.permissions.manageInheritance",
            permission: "ui.plugins.permissions.users.manageUsers.manageInheritance",
            action: context => {
                context.setData("selectedPHolder", context.getData("selectedUser"));
                context.goTo("manageInheritance");
            }
        }
    ]
};
