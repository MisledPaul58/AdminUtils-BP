import { Group } from "./model/group";
import { Translations } from "../utils/translations";
export var PermissionCheckError;
(function (PermissionCheckError) {
    PermissionCheckError[PermissionCheckError["INVALID_PERMISSION"] = 0] = "INVALID_PERMISSION";
})(PermissionCheckError || (PermissionCheckError = {}));
export class PermissionManager {
    groups = new Map();
    users = new Map();
    constructor() {
    }
    createGroup(sender, identifier, displayName, weight, parents) {
        if (!isValidIdentifier(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);
        if (!isValidDisplayName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);
        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroupError);
        const group = new Group(identifier, displayName, weight);
        const failedInheritances = [];
        if (parents) {
            for (const parent of parents) {
                const result = group.addParent(parent);
                if (!result)
                    failedInheritances.push(parent);
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
    getGroup(identifier) {
        return this.groups.get(identifier);
    }
    getGroups() {
        return this.groups.values();
    }
    hasPermission(permission, target) {
        //TODO check permission is valid, etc
        if (!isValidPermission(permission))
            return PermissionCheckError.INVALID_PERMISSION;
        return !!target.resolvePermission(permission);
    }
}
function isValidPermission(permission) {
    const permissionRegex = /^([a-zA-Z0-9_-]+)(\.([a-zA-Z0-9_-]+))*(\.\*)?$/;
    return permissionRegex.test(permission);
}
function isValidIdentifier(identifier) {
    return /^[a-zA-Z0-9_]+$/.test(identifier);
}
function isValidDisplayName(displayName) {
    return /^[a-zA-Z0-9_§]+$/.test(displayName);
}
