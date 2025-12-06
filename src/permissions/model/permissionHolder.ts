import { PermissionNode } from "../permissionNode";
import { Group } from "./group";
import { WildcardProcessor } from "../calculator/wildcardProcessor";

export enum HolderType {
    USER,
    GROUP
}

export type Tristate = boolean | undefined;

export abstract class PermissionHolder {
    public readonly identifier: string;

    protected nodeMap = new Map<string, PermissionNode>();
    protected wildcardMap = new Map<string, PermissionNode>();
    protected inheritanceMap = new Map<string, Group>();
    protected cache = new Map<string, Tristate>;

    protected constructor(identifier: string) {
        this.identifier = identifier;
    }

    public abstract getType(): HolderType;

    resolvePermission(permission: string): Tristate {
        if (WildcardProcessor.isWildcardPermission(permission)) return undefined;

        // Check cache
        if (this.cache.has(permission)) return this.cache.get(permission);

        // Direct check
        if (this.nodeMap.has(permission)) {
            const result: boolean = this.nodeMap.get(permission)!.value;
            // Save in cache
            this.cache.set(permission, result);
            return result;
        }

        // Wildcard check
        let highestWildcard = { level: 0 } as { wildcard: PermissionNode, level: number };
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
        let highestPermission = { weight: -Infinity } as { value: boolean, weight: number };
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

    addPermissionNode(permissionNode: PermissionNode): boolean {
        const { permission } = permissionNode;
        if (this.nodeMap.has(permission) || this.wildcardMap.has(permission)) return false;
        //TODO add an enum with possible reasons the permission node couldn't be added
        //TODO manage cache

        if (permissionNode.isWildcard()) {
            this.wildcardMap.set(permission, permissionNode);
            this.cache.clear();
        } else {
            this.nodeMap.set(permission, permissionNode);
            this.cache.set(permission, permissionNode.value);
        }

        return true;
    }

    addParent(parent: Group): boolean {
        if (this.inheritanceMap.has(parent.identifier) || !isValidInheritance(parent)) return false;

        this.inheritanceMap.set(parent.identifier, parent);
        return true;
    }

    removeParent(parent: Group): boolean {
        //Maybe update cache intelligently in this case in the future
        this.cache.clear();
        return this.inheritanceMap.delete(parent.identifier);
    }

    *getInheritance(): Generator<Group> {
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
            yield* group.getInheritance();
        }
    }

    save(): boolean {


        return true;
    }
}

// Prevents circular inheritance
function isValidInheritance(parent: Group): boolean {
    const seen = new Set<Group>();
    for (const group of parent.getInheritance()) {
        if (seen.has(group)) return false;
        seen.add(group);
    }
    return true;
}