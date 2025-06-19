import { Cache } from "../cache";
export var HolderType;
(function (HolderType) {
    HolderType[HolderType["USER"] = 0] = "USER";
    HolderType[HolderType["GROUP"] = 1] = "GROUP";
})(HolderType || (HolderType = {}));
export class PermissionHolder {
    constructor(identifier) {
        this.nodeMap = new Map();
        this.wildcardMap = new Map();
        this.inheritanceMap = new Map();
        this.cache = new Cache();
        this.identifier = identifier;
    }
    hasPermission(permission) {
        // Check cache
        if (this.cache.permissions.has(permission))
            return this.cache.permissions.get(permission);
        // Direct check
        if (this.nodeMap.has(permission)) {
            const result = this.nodeMap.get(permission).value;
            // Save in cache
            this.cache.permissions.set(permission, result);
            return result;
        }
        // Wildcard check
        for (const wildcard of this.wildcardMap.keys()) {
        }
    }
    addPermissionNode(permissionNode) {
        if (this.nodeMap.has(permissionNode.permission) || this.wildcardMap.has(permissionNode.permission))
            return false;
        //TODO add an enum with possible reasons the permission node couldn't be added
        if (permissionNode.isWildcard)
            this.wildcardMap.set(permissionNode.permission, permissionNode);
        else
            this.nodeMap.set(permissionNode.permission, permissionNode);
        return true;
    }
    addParent(parent) {
        //TODO prevent circular inheritance
        if (this.inheritanceMap.has(parent.identifier))
            return false;
        this.inheritanceMap.set(parent.identifier, parent);
        return true;
    }
}
