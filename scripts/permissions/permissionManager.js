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
        if (!isValidName(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);
        if (!isValidName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);
        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroupError);
        this.groups.set(identifier, new Group(identifier, displayName, weight)); //TODO ofrecer también crear el grupo con los parents y guardar los groups a la rom?
        //Save
        sender.sendSuccess(Translations.Msg.Permissions.GroupCreated, [displayName]);
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
function isValidName(name) {
    return /^[a-zA-Z0-9_]+$/.test(name);
}
