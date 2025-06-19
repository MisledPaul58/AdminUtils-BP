import { PermissionNode } from "../permissionNode";
import { Cache } from "../cache";
import { Group } from "./group";

export enum HolderType {
    USER,
    GROUP
}

export abstract class PermissionHolder {
    public readonly identifier: string;

    protected nodeMap = new Map<string, PermissionNode>();
    protected wildcardMap = new Map<string, PermissionNode>();
    protected inheritanceMap = new Map<string, Group>();
    public cache = new Cache();

    protected constructor(identifier: string) {
        this.identifier = identifier;
    }

    public abstract getType(): HolderType;

    hasPermission(permission: string): boolean {
        // Check cache
        if (this.cache.permissions.has(permission)) return this.cache.permissions.get(permission) as boolean;

        // Direct check
        if (this.nodeMap.has(permission)) {
            const result: boolean = this.nodeMap.get(permission)!.value;
            // Save in cache
            this.cache.permissions.set(permission, result);
            return result;
        }

        // Wildcard check
        for (const wildcard of this.wildcardMap.keys()) {
            
        }
    }

    addPermissionNode(permissionNode: PermissionNode): boolean {
        if (this.nodeMap.has(permissionNode.permission) || this.wildcardMap.has(permissionNode.permission)) return false;
        //TODO add an enum with possible reasons the permission node couldn't be added

        if (permissionNode.isWildcard) this.wildcardMap.set(permissionNode.permission, permissionNode)
        else this.nodeMap.set(permissionNode.permission, permissionNode);

        return true;
    }

    addParent(parent: Group) {
        //TODO prevent circular inheritance
        if (this.inheritanceMap.has(parent.identifier)) return false;

        this.inheritanceMap.set(parent.identifier, parent);
        return true;
    }
}