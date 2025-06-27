import { Group } from "./model/group";
import { Translations } from "../utils/translations";
export class PermissionManager {
    constructor() {
        this.groups = new Map();
        this.users = new Map();
    }
    createGroup(sender, identifier, displayName, weight, parents) {
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
    hasPermission(permission, target) {
        //TODO check permission is valid, etc
        return !!target.resolvePermission(permission);
    }
}
function isValidName(name) {
    return /^[a-zA-Z0-9_]+$/.test(name);
}
