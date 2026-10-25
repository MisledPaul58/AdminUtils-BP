import { ActionButton, ActionElement, ActionForm, Label } from "../builder";
import { DB } from "../../database/databaseManager";
import { server } from "../../server";
import { RawMessage, world } from "@minecraft/server";

export const manageAdmins: ActionForm = {
    type: "action",
    title: "%settings.admins.title",
    elements: [
        {
            type: "button",
            text: "%settings.admins.add",
            icon: "textures/icons/add.png",
            permission: "ui.settings.admins.add",
            action: (context) => {
                context.goTo("addAdmin");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.admins.remove",
            icon: "textures/icons/delete.png",
            permission: "ui.settings.admins.remove",
            action: (context) => {
                context.goTo("removeAdmin");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.admins.see",
            icon: "textures/icons/users.png",
            permission: "ui.settings.admins.see",
            action: (context) => {
                context.goTo("seeAdmins");
            }
        } as ActionButton,
    ]
};

export const addAdmin: ActionForm = {
    type: "action",
    title: "%settings.admins.add",
    elements: (context) => {
        function addPlayerAsAdmin(player: string): void {
            if (server.isAdmin(player)) {
                return context.player.sendError("settings.alreadyAdmin", [player]);
            }

            DB.Server.set("admins", [...server.getAdmins(), player]);
            context.player.sendSuccess("settings.addAdminSuccess", [player]);
        }

        const elements: ActionElement[] = [
            {
                type: "button",
                text: "%ui.typePlayer",
                icon: "textures/icons/pencil.png",
                permission: "ui.settings.admins.add",
                action: (context) => {
                    context.typePlayer("settings.admins.add", (player) => {
                        if (!server.isValidUsername(player)) {
                            return context.player.sendError("ui.invalidUsername");
                        }

                        addPlayerAsAdmin(player);
                        context.back();
                    });
                }
            } as ActionButton
        ];

        elements.push({
            type: "label",
            text: "%ui.players"
        } as Label);

        for (const player of world.getAllPlayers()) {
            if (server.isAdmin(player.name)) continue;
            elements.push({
                type: "button",
                text: player.name,
                icon: "textures/icons/steve_icon.png",
                permission: "ui.settings.admins.add",
                action: (context) => {
                    context.confirm(
                        "%settings.admins.add",
                        { translate: "settings.admins.add.confirm", with: [player.name] } as RawMessage,
                        () => {
                            addPlayerAsAdmin(player.name);
                            context.back();
                        }
                    );
                }
            } as ActionButton);
        }

        return elements;
    }
};

export const removeAdmin: ActionForm = {
    type: "action",
    title: "%settings.admins.remove",
    elements: (context) => {
        function removeAdmin(player: string): void {
            if (!server.isAdmin(player)) {
                return context.player.sendError("settings.notAdmin", [player]);
            }

            const admins: string[] = server.getAdmins().filter(admin => admin !== player);
            DB.Server.set("admins", admins);

            context.player.sendSuccess("settings.removeAdminSuccess", [player]);
        }

        const elements: ActionElement[] = [
            {
                type: "button",
                text: "%ui.typePlayer",
                icon: "textures/icons/pencil.png",
                permission: "ui.settings.admins.remove",
                action: (context) => {
                    context.typePlayer("settings.admins.remove", (player) => {
                        if (!server.isValidUsername(player)) {
                            return context.player.sendError("ui.invalidUsername");
                        }

                        removeAdmin(player);
                        context.back();
                    });
                }
            } as ActionButton
        ];

        elements.push({
            type: "label",
            text: "%ui.players"
        } as Label);

        for (const player of server.getAdmins()) {
            elements.push({
                type: "button",
                text: player,
                icon: "textures/icons/steve_icon.png",
                permission: "ui.settings.admins.remove",
                action: (context) => {
                    context.confirm(
                        "%settings.admins.remove",
                        { translate: "settings.admins.remove.confirm", with: [player] } as RawMessage,
                        () => {
                            removeAdmin(player);
                            context.back();
                        }
                    );
                }
            } as ActionButton);
        }

        return elements;
    }
};

export const seeAdmins: ActionForm = {
    type: "action",
    title: "%settings.admins.see",
    elements: () => {
        const buttons: ActionButton[] = [];
        for (const admin of server.getAdmins()) {
            buttons.push({
                type: "button",
                text: admin,
                icon: "textures/icons/steve_icon.png",
                permission: "ui.settings.admins.see",
                action: (context) => {
                    context.goTo("seeAdmins");
                }
            } as ActionButton);
        }

        return buttons;
    }
};
