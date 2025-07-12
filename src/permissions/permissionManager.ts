import { Group } from "./model/group";
import { User } from "./model/user";
import { Player } from "@minecraft/server";
import { Translations } from "../utils/translations";
import { PermissionHolder } from "./model/permissionHolder";

export enum Result {
    INVALID_PERMISSION
}

export class PermissionManager {
    public groups = new Map<string, Group>();
    private users = new Map<string, User>();

    constructor() {

    }

    createGroup(sender: Player, identifier: string, displayName: string, weight: number, parents?: Group[]): Group | void {
        if (!isValidName(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);

        if (!isValidName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);

        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroup);

        this.groups.set(identifier, new Group(identifier, displayName, weight)); //TODO ofrecer también crear el grupo con los parents y guardar los groups a la rom?
        //Save
        sender.sendSuccess(Translations.Msg.Permissions.GroupCreated, [displayName]);
        return this.groups.get(identifier);
    }

    hasPermission(permission: string, target: PermissionHolder): boolean | Result {
        //TODO check permission is valid, etc
        if (!isValidPermission(permission))
            return Result.INVALID_PERMISSION;
        return !!target.resolvePermission(permission);
    }
}

function isValidPermission(permission: string): boolean {
    const permissionRegex = /^([a-zA-Z0-9_-]+)(\.([a-zA-Z0-9_-]+))*(\.\*)?$/;
    return permissionRegex.test(permission);
}

function isValidName(name: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(name);

}