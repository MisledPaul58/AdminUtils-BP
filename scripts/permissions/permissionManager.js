import { Group } from "./model/group";
import { User } from "./model/user";
import { Translations } from "../utils/translations";
import { database } from "../database/index";
export var PermissionCheckError;
(function (PermissionCheckError) {
    PermissionCheckError[PermissionCheckError["INVALID_PERMISSION"] = 0] = "INVALID_PERMISSION";
})(PermissionCheckError || (PermissionCheckError = {}));
//TODO put permissions folder inside plugins?
export class PermissionManager {
    autoSave;
    groups = new Map();
    users = new Map();
    constructor(autoSaveManager) {
        this.autoSave = autoSaveManager;
    }
    createGroup(sender, identifier, displayName, weight, parents) {
        if (!isValidIdentifier(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);
        if (!isValidDisplayName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);
        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroupError);
        const group = new Group(identifier, displayName, weight, this.autoSave.onEntityDirty);
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
        group.markAsNew(); // Adds the new group to the save queue immediately
        sender.sendSuccess(Translations.Msg.Permissions.GroupCreated, [displayName]);
        if (failedInheritances[0]) {
            sender.sendCustomMessage(Translations.Msg.Permissions.AddParentFail);
            for (const group of failedInheritances) {
                sender.sendCustomMessage(`§l§4* §r§c${group.displayName}`);
            }
        }
        return group;
    }
    setGroupWeight(targetGroup, weight) {
        if (targetGroup.weight === weight)
            return false;
        targetGroup.weight = weight;
        targetGroup.cache.clear();
        targetGroup.metadataChanged = true;
        targetGroup.markDirty();
        // Clear cache for safety from permission holders that inherited from the target group
        for (const otherGroup of this.groups.values()) {
            if (otherGroup === targetGroup)
                continue;
            if (otherGroup.isChildOf(targetGroup)) {
                otherGroup.cache.clear();
            }
        }
        for (const user of this.users.values()) {
            if (user.isChildOf(targetGroup)) {
                user.cache.clear();
            }
        }
        return true;
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
    *loadPlugin() {
        //TODO make sure to run this if the plugin is enabled later in game
        try {
            const groups = database.permissions.get("groups") ?? {};
            const users = database.permissions.get("users") ?? {};
            // Load groups
            for (const groupData of Object.values(groups)) {
                const { id, displayName, weight } = groupData;
                const group = new Group(id, displayName, weight, this.autoSave.onEntityDirty);
                yield* group.loadPermissionsFromData(groupData);
                yield this.groups.set(id, group);
            }
            for (const group of this.groups.values()) {
                const groupData = groups[group.identifier];
                yield* group.loadParentsFromData(groupData, this.groups);
            }
            // Load users
            for (const userData of Object.values(users)) {
                const { id } = userData;
                const user = new User(id, this.autoSave.onEntityDirty);
                yield* user.loadPermissionsFromData(userData);
                yield this.users.set(id, user);
            }
            for (const user of this.users.values()) {
                const userData = users[user.identifier];
                yield* user.loadParentsFromData(userData, this.groups);
            }
        }
        catch (e) {
            console.error("Couldn't load permissions plugin:", e);
        }
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
