import { Group } from "./model/group";
import { User } from "./model/user";
import { Player } from "@minecraft/server";
import { Translations } from "../utils/translations";

export class PermissionManager {
    private groups = new Map<string, Group>();
    private users = new Map<string, User>();

    constructor() {

    }

    createGroup(identifier: string, displayName: string, weight: number, sender: Player): Group | void {
        if (!isValidName(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);

        if (!isValidName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);

        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroup);

        this.groups.set(identifier, new Group(identifier, displayName, weight)); //TODO ofrecer también crear el grupo con los parents y guardar los groups a la rom?
    }
}

function isValidName(name: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(name);
}