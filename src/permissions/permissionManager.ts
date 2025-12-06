import { Group } from "./model/group";
import { User } from "./model/user";
import { Player } from "@minecraft/server";
import { Translations } from "../utils/translations";
import { PermissionHolder } from "./model/permissionHolder";

export enum PermissionCheckError {
    INVALID_PERMISSION
}

export class PermissionManager {
    private groups = new Map<string, Group>();
    private users = new Map<string, User>();

    constructor() {

    }

    createGroup(sender: Player, identifier: string, displayName: string, weight: number, parents?: Group[]): Group | void {
        if (!isValidIdentifier(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);

        if (!isValidDisplayName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);

        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroupError);

        const group = new Group(identifier, displayName, weight);
        const failedInheritances: Group[] = [];
        if (parents) {
            for (const parent of parents) {
                const result = group.addParent(parent);
                if (!result) failedInheritances.push(parent);
            }
        }

        //Save
        this.groups.set(identifier, group); //TODO ofrecer también crear el grupo con los parents y guardar los groups a la rom?
        sender.sendSuccess(Translations.Msg.Permissions.GroupCreated, [displayName]);
        if (failedInheritances[0]) {
            sender.sendCustomMessage(Translations.Msg.Permissions.AddParentFail);
            for (const group of failedInheritances) {
                sender.sendCustomMessage(`§l§4* §r§c${group.displayName}`);
            }
        }
        return group;
    }

    getGroup(identifier: string): Group | undefined {
        return this.groups.get(identifier);
    }

    getGroups(): IteratorObject<Group> {
        return this.groups.values();
    }

    hasPermission(permission: string, target: PermissionHolder): boolean | PermissionCheckError {
        //TODO check permission is valid, etc
        if (!isValidPermission(permission))
            return PermissionCheckError.INVALID_PERMISSION;
        return !!target.resolvePermission(permission);
    }
}

function isValidPermission(permission: string): boolean {
    const permissionRegex = /^([a-zA-Z0-9_-]+)(\.([a-zA-Z0-9_-]+))*(\.\*)?$/;
    return permissionRegex.test(permission);
}

function isValidIdentifier(identifier: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(identifier);
}

function isValidDisplayName(displayName: string): boolean {
    return /^[a-zA-Z0-9_§]+$/.test(displayName);
}