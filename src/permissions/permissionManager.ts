import { Group } from "./model/group";
import { User } from "./model/user";
import { Player, world } from "@minecraft/server";
import { Translations } from "../utils/translations";
import {
    BaseSerializedData,
    GroupSerializedData,
    PermissionHolder,
    SerializedData,
    UserSerializedData
} from "./model/permissionHolder";
import { AutoSaveManager } from "../utils/persistence/autoSaveManager";
import { database } from "../database/index";
import { DatabaseObject } from "../database/database";

export enum PermissionCheckError {
    INVALID_PERMISSION
}

export class PermissionManager {
    private autoSave: AutoSaveManager;

    private groups = new Map<string, Group>();
    private users = new Map<string, User>();

    constructor(autoSaveManager: AutoSaveManager) {
        this.autoSave = autoSaveManager;
    }

    createGroup(sender: Player, identifier: string, displayName: string, weight: number, parents?: Group[]): Group | void {
        if (!isValidIdentifier(identifier))
            return sender.sendError(Translations.Msg.Permissions.InvalidIdentifier);

        if (!isValidDisplayName(displayName))
            return sender.sendError(Translations.Msg.Permissions.InvalidName);

        if (this.groups.has(identifier))
            return sender.sendError(Translations.Msg.Permissions.ExistingGroupError);

        const group = new Group(identifier, displayName, weight, this.autoSave.onEntityDirty);
        const failedInheritances: Group[] = [];
        if (parents) {
            for (const parent of parents) {
                const result = group.addParent(parent);
                if (!result) failedInheritances.push(parent);
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

    getGroup(identifier: string): Group | undefined {
        return this.groups.get(identifier);
    }

    getGroups(): IteratorObject<Group> {
        return this.groups.values();
    }

    hasPermission(permission: string, target: PermissionHolder): boolean | PermissionCheckError { //TODO check if the plugin is actually enabled, if not, just check if the player is an admin or operator?
        //TODO check permission is valid, etc
        if (!isValidPermission(permission))
            return PermissionCheckError.INVALID_PERMISSION;
        return !!target.resolvePermission(permission);
    }

    *loadPlugin() {
        if (!database.permissions.get("-auEnabled")) return; //TODO make sure to run this if the plugin is enabled later in game

        try {
            const groups = database.permissions.get("groups") ?? {}
            const users = database.permissions.get("users") ?? {};

            // Load groups
            for (const groupData of Object.values(groups)) {
                const { id, displayName, weight } = groupData as BaseSerializedData & GroupSerializedData;
                const group = new Group(id, displayName, weight, this.autoSave.onEntityDirty);

                yield* group.loadPermissionsFromData(groupData as BaseSerializedData & GroupSerializedData);

                yield this.groups.set(id, group);
            }

            for (const group of this.groups.values()) {
                const groupData = ((groups as DatabaseObject)[group.identifier] as unknown as SerializedData) as BaseSerializedData & GroupSerializedData;
                yield* group.loadParentsFromData(groupData, this.groups);
            }

            // Load users
            for (const userData of Object.values(users)) {
                const { id } = userData as BaseSerializedData & UserSerializedData;
                const user = new User(id, this.autoSave.onEntityDirty);

                yield* user.loadPermissionsFromData(userData as BaseSerializedData & UserSerializedData);

                yield this.users.set(id, user);
            }

            for (const user of this.users.values()) {
                const userData = ((users as DatabaseObject)[user.identifier] as unknown as SerializedData) as BaseSerializedData & UserSerializedData;
                yield* user.loadParentsFromData(userData, this.groups);
            }

        } catch (e) {
            console.error("Couldn't load permissions plugin:", e);
        }
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