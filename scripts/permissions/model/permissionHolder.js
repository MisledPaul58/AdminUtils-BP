import { PermissionNode } from "../permissionNode";
import { WildcardProcessor } from "../calculator/wildcardProcessor";
import { ChangeType, Difference } from "./difference";
import { PersistableEntity } from "../../utils/persistence/persistableEntity";
import { database } from "../../database/index";
export var HolderType;
(function (HolderType) {
    HolderType["USER"] = "USER";
    HolderType["GROUP"] = "GROUP";
})(HolderType || (HolderType = {}));
export class PermissionHolder extends PersistableEntity {
    identifier;
    nodeMap = new Map();
    wildcardMap = new Map();
    inheritanceMap = new Map();
    cache = new Map;
    permissionChanges = new Difference((a, b) => a.equals(b));
    inheritanceChanges = new Difference();
    metadataChanged = false;
    constructor(identifier, onDirty) {
        super(onDirty);
        this.identifier = identifier;
    }
    // Prevents circular inheritance
    isNewParentValid(parentCandidate) {
        if (parentCandidate === (this))
            return false;
        // Check the inheritance tree of this holder
        const currentTree = Array.from(this.getInheritanceTree());
        if (currentTree.some(treeGroup => treeGroup === parentCandidate))
            return false;
        // Check the inheritance tree of the possible parent
        const seen = new Set();
        for (const group of parentCandidate.getInheritanceTree()) {
            if (seen.has(group) || group === (this))
                return false;
            if (currentTree.some(treeGroup => group === treeGroup))
                return false;
            seen.add(group);
        }
        return true;
    }
    resolvePermission(permission) {
        if (WildcardProcessor.isWildcardPermission(permission))
            return undefined;
        // Check cache
        if (this.cache.has(permission))
            return this.cache.get(permission);
        // Direct check
        if (this.nodeMap.has(permission)) {
            const result = this.nodeMap.get(permission).value;
            // Save in cache
            this.cache.set(permission, result);
            return result;
        }
        // Wildcard check
        let highestWildcard = { level: 0 };
        for (const wildcard of this.wildcardMap.values()) {
            if (WildcardProcessor.includesPermission(wildcard.permission, permission) && wildcard.wildcardLevel > highestWildcard.level) {
                highestWildcard = {
                    wildcard: wildcard,
                    level: wildcard.wildcardLevel,
                };
            }
        }
        const { wildcard } = highestWildcard;
        if (wildcard) {
            const result = wildcard.value;
            // Save in cache
            this.cache.set(wildcard.permission, result);
            return result;
        }
        // Inheritance check
        let highestPermission = { weight: -Infinity };
        for (const group of this.inheritanceMap.values()) {
            const result = group.resolvePermission(permission);
            if (result !== undefined && group.weight > highestPermission.weight) {
                highestPermission = {
                    value: result,
                    weight: group.weight
                };
            }
        }
        const resolvedValue = highestPermission.value;
        if (resolvedValue !== undefined) {
            this.cache.set(permission, resolvedValue);
            return resolvedValue;
        }
        this.cache.set(permission, undefined);
        return undefined;
    }
    addPermissionNode(permissionNode) {
        const { permission } = permissionNode;
        //TODO add an enum with possible reasons the permission node couldn't be added?
        if (this.nodeMap.has(permission)) {
            const oldNode = this.nodeMap.get(permission);
            if (oldNode.equals(permissionNode))
                return false;
            // If the node already exists but with a different value (so it's not exactly equal), the old node will be overridden
            this.permissionChanges.recordChange(ChangeType.REMOVE, oldNode);
        }
        else if (this.wildcardMap.has(permission)) {
            const oldNode = this.wildcardMap.get(permission);
            if (oldNode.equals(permissionNode))
                return false;
            this.permissionChanges.recordChange(ChangeType.REMOVE, oldNode);
        }
        if (permissionNode.isWildcard()) {
            this.wildcardMap.set(permission, permissionNode);
            this.cache.clear();
        }
        else {
            this.nodeMap.set(permission, permissionNode);
            this.cache.set(permission, permissionNode.value);
        }
        this.permissionChanges.recordChange(ChangeType.ADD, permissionNode);
        this.markDirty();
        return true;
    }
    removePermissionNode(permission) {
        let node;
        if (this.nodeMap.has(permission)) {
            node = this.nodeMap.get(permission);
            this.nodeMap.delete(permission);
        }
        else if (this.wildcardMap.has(permission)) {
            node = this.wildcardMap.get(permission);
            this.wildcardMap.delete(permission);
        }
        else
            return false;
        this.cache.delete(permission);
        this.permissionChanges.recordChange(ChangeType.REMOVE, node);
        this.markDirty();
        return true;
    }
    addParent(parent) {
        if (this.inheritanceMap.has(parent.identifier) || !this.isNewParentValid(parent))
            return false;
        this.inheritanceMap.set(parent.identifier, parent);
        this.inheritanceChanges.recordChange(ChangeType.ADD, parent.identifier); // Clearing cache shouldn't be necessary
        this.markDirty();
        return true;
    }
    removeParent(parent) {
        if (this.inheritanceMap.delete(parent.identifier)) {
            this.cache.clear();
            this.inheritanceChanges.recordChange(ChangeType.REMOVE, parent.identifier);
            this.markDirty();
            return true;
        }
        return false;
    }
    *getInheritanceTree() {
        // Breadth-first
        // const queue: Group[] = [...this.inheritanceMap.values()];
        //
        // while (queue.length > 0) {
        //     const current = queue.shift()!;
        //     yield current;
        //
        //     for (const inherited of current.inheritanceMap.values()) {
        //         queue.push(inherited);
        //     }
        // }
        // Depth-first
        for (const group of this.inheritanceMap.values()) {
            yield group;
            yield* group.getInheritanceTree();
        }
    }
    *getPermissionNodes() {
        yield* this.nodeMap.values();
        yield* this.wildcardMap.values();
    }
    *getDirectParents() {
        for (const group of this.inheritanceMap.values()) {
            yield group;
        }
    }
    isChildOf(parent) {
        for (const group of this.getInheritanceTree()) {
            if (group === parent)
                return true;
        }
        return false;
    }
    export() {
        const permissions = {};
        const wildcards = {};
        for (const node of this.nodeMap.values()) {
            permissions[node.permission] = node.value;
        }
        for (const node of this.wildcardMap.values()) {
            wildcards[node.permission] = node.value;
        }
        const parents = Array.from(this.inheritanceMap.keys());
        const baseData = {
            id: this.identifier,
            type: this.getType(),
            permissions,
            wildcards,
            parents
        };
        return {
            ...baseData,
            ...this.getSpecificData()
        };
    }
    //TODO add more safety?
    save() {
        try {
            if (!this.needsInitialSave && this.permissionChanges.isEmpty() && this.inheritanceChanges.isEmpty() && !this.metadataChanged) {
                return true;
            }
            // If this PermissionHolder hasn't been saved before, or if it's the first time permissions are being used
            if (isInitialSave(this))
                return initialSave(this);
            const keyType = this.getType() === HolderType.GROUP ? "groups" : "users";
            const memory = database.permissions.get(keyType)[this.identifier];
            // Apply any permission change
            for (const change of this.permissionChanges.getChanges()) {
                const node = change.value;
                if (change.type === ChangeType.ADD) {
                    addPermissionChange(memory, node);
                }
                else {
                    delete memory[node.isWildcard() ? "wildcards" : "permissions"][node.permission];
                }
            }
            // Apply any inheritance change
            for (const change of this.inheritanceChanges.getChanges()) {
                if (change.type === ChangeType.ADD) {
                    memory["parents"].push(change.value);
                }
                else {
                    memory["parents"].splice(memory["parents"].indexOf(change.value), 1);
                }
            }
            // Apply any metadata change
            if (this.metadataChanged)
                Object.assign(memory, this.getSpecificData());
            // Save and clear everything
            const packedData = packData(memory, this.identifier);
            database.permissions.assign(keyType, packedData);
            this.permissionChanges.clear();
            this.inheritanceChanges.clear();
            return true;
        }
        catch (e) {
            console.error(`Failed to save ${this.identifier}:`, e);
            return false;
        }
    }
    *loadPermissionsFromData(data) {
        for (const [permission, value] of Object.entries(data.permissions)) {
            const node = new PermissionNode(permission, value);
            yield this.nodeMap.set(permission, node);
        }
        for (const [permission, value] of Object.entries(data.wildcards)) {
            const wildcard = new PermissionNode(permission, value);
            yield this.wildcardMap.set(permission, wildcard);
        }
    }
    *loadParentsFromData(data, groupMap) {
        for (const groupId of data.parents) {
            const group = groupMap.get(groupId);
            if (group) {
                yield this.inheritanceMap.set(groupId, group);
            }
        }
    }
}
function packData(data, withKey) {
    const packedData = {};
    packedData[withKey] = data;
    return packedData;
}
function isInitialSave(permissionHolder) {
    const keyType = permissionHolder.getType() === HolderType.GROUP ? "groups" : "users";
    return !database.permissions.get(keyType)?.[permissionHolder.identifier];
}
function initialSave(permissionHolder) {
    const keyType = permissionHolder.getType() === HolderType.GROUP ? "groups" : "users";
    const packedData = packData(permissionHolder.export(), permissionHolder.identifier);
    database.permissions.assign(keyType, packedData);
    permissionHolder.permissionChanges.clear();
    permissionHolder.inheritanceChanges.clear();
    return true;
}
function addPermissionChange(memory, permissionNode) {
    const directory = permissionNode.isWildcard() ? "wildcards" : "permissions";
    if (typeof memory[directory] !== "object") {
        memory[directory] = {};
    }
    memory[directory][permissionNode.permission] = permissionNode.value;
}
