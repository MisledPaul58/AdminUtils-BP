import { Group } from "./model/group";
import { User } from "./model/user";
import { PlayerPermissionLevel, world } from "@minecraft/server";
import { Translations } from "../utils/translations";
import { DB } from "../database/databaseManager";
import { server } from "../server";
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
        "adminMenuCmd",
        "ui.settings",
        "ui.settings.resetConfig",
        "ui.settings.config",
        "ui.settings.admins",
        "ui.settings.database",
        "ui.au",
        "ui.au.ban",
        "ui.au.jail",
        "ui.au.vanish",
        "ui.au.freeze",
        "ui.au.seeInv",
        "ui.au.freecam",
        "ui.au.projectilePowers",
        "ui.au.kill",
        "ui.au.launch",
        "ui.plugins",
        "ui.plugins.permissions",
        "ui.plugins.permissions.toggle",
        "ui.plugins.permissions.groups",
        "ui.plugins.permissions.groups.createNew",
        "ui.plugins.permissions.groups.manageGroups",
        "ui.plugins.permissions.groups.manageGroups.editProperties",
        "ui.plugins.permissions.groups.manageGroups.managePermissions",
        "ui.plugins.permissions.groups.manageGroups.manageInheritance",
        "ui.plugins.permissions.groups.manageGroups.deleteGroup",
        "ui.plugins.permissions.users",
        "ui.plugins.permissions.users.manageUsers",
        "ui.plugins.permissions.users.manageUsers.managePermissions",
        "ui.plugins.permissions.users.manageUsers.manageInheritance",
        "ui.plugins.permissions.genericHolder.managePermissions.addPerm",
        "ui.plugins.permissions.genericHolder.managePermissions.permission",
        "ui.plugins.permissions.genericHolder.managePermissions.permission.toggle",
        "ui.plugins.permissions.genericHolder.managePermissions.permission.delete",
        "ui.plugins.permissions.genericHolder.manageInheritance.addParent",
        "ui.plugins.permissions.genericHolder.manageInheritance.parent",
        "ui.plugins.permissions.genericHolder.manageInheritance.parent.edit",
        "ui.plugins.permissions.genericHolder.manageInheritance.parent.remove"
    ];
    constructor(autoSaveManager) {
        this.autoSave = autoSaveManager;
    }
    isValidPermission(permission) {
        const permissionRegex = /^([a-zA-Z0-9_-]+)(\.([a-zA-Z0-9_-]+))*(\.\*)?$/;
        return permissionRegex.test(permission);
    }
    isEnabled() {
        return !!DB.Permissions.get("-auEnabled");
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
        const memory = DB.Permissions.get("groups");
        delete memory[selectedGroup.identifier];
        DB.Permissions.saveData();
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
            return server.isAdmin(player.name);
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
            const groups = DB.Permissions.get("groups") ?? {};
            const users = DB.Permissions.get("users") ?? {};
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
