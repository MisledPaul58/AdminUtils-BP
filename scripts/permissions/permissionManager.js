import { Group } from "./model/group";
import { User } from "./model/user";
import { CommandPermissionLevel, PlayerPermissionLevel, world } from "@minecraft/server";
import { Translations } from "../utils/translations";
import { database } from "../database/index";
export var PermissionCheckError;
(function (PermissionCheckError) {
    PermissionCheckError[PermissionCheckError["INVALID_PERMISSION"] = 0] = "INVALID_PERMISSION";
})(PermissionCheckError || (PermissionCheckError = {}));
export class PermissionManager {
    autoSave;
    groups = new Map();
    users = new Map();
    PERMISSIONS = [
        "adminWand",
        "settings",
        "au",
        "plugins"
    ];
    constructor(autoSaveManager) {
        this.autoSave = autoSaveManager;
    }
    isValidPermission(permission) {
        const permissionRegex = /^([a-zA-Z0-9_-]+)(\.([a-zA-Z0-9_-]+))*(\.\*)?$/;
        return permissionRegex.test(permission);
    }
    isEnabled() {
        return !!database.permissions.get("-auEnabled");
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
        this.groups.set(identifier, group);
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
    deleteGroup(selectedGroup) {
        for (const group of this.getGroups()) {
            group.removeParent(selectedGroup);
        }
        for (const user of this.getUsers()) {
            user.removeParent(selectedGroup);
        }
        const memory = database.permissions.get("groups");
        delete memory[selectedGroup.identifier];
        database.permissions.saveData();
        return this.groups.delete(selectedGroup.identifier);
    }
    setGroupWeight(targetGroup, weight) {
        if (targetGroup.weight === weight)
            return true;
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
    //TODO add sender parameter to send error message?
    setGroupDisplayName(targetGroup, displayName) {
        if (targetGroup.displayName === displayName)
            return true;
        if (!isValidDisplayName(displayName))
            return false;
        targetGroup.displayName = displayName;
        targetGroup.metadataChanged = true;
        targetGroup.markDirty();
        return true;
    }
    getGroup(identifier) {
        return this.groups.get(identifier);
    }
    getGroups() {
        return this.groups.values();
    }
    getUsers() {
        return this.users.values();
    }
    hasPermission(permission, player, defaultTrue = false) {
        if (!this.isValidPermission(permission))
            return PermissionCheckError.INVALID_PERMISSION;
        if (!this.isEnabled()) {
            return player.commandPermissionLevel === CommandPermissionLevel.Admin
                || player.commandPermissionLevel === CommandPermissionLevel.Host
                || player.commandPermissionLevel === CommandPermissionLevel.Owner;
        }
        if (player.playerPermissionLevel === PlayerPermissionLevel.Operator)
            return true;
        const target = this.users.get(player.name);
        if (!target)
            return false;
        const result = target.resolvePermission(permission);
        if (defaultTrue && result === undefined)
            return true;
        return !!result;
    }
    *loadPlugin() {
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
            // Load new users
            for (const player of world.getPlayers()) {
                if (this.users.has(player.name))
                    continue;
                const newUser = new User(player.name, this.autoSave.onEntityDirty);
                this.users.set(player.name, newUser);
            }
            const callback = world.afterEvents.playerJoin.subscribe(event => {
                if (!this.isEnabled())
                    return world.afterEvents.playerJoin.unsubscribe(callback);
                if (this.users.has(event.playerName))
                    return;
                const newUser = new User(event.playerName, this.autoSave.onEntityDirty);
                this.users.set(event.playerName, newUser);
            });
        }
        catch (e) {
            console.error("Couldn't load permissions plugin:", e);
        }
    }
}
function isValidIdentifier(identifier) {
    return /^[a-zA-Z0-9_]+$/.test(identifier);
}
function isValidDisplayName(displayName) {
    return /^[a-zA-Z0-9_§]+$/.test(displayName);
}
