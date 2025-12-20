import { PermissionNode, SerializedPermissionNode } from "../permissionNode";
import { Group } from "./group";
import { WildcardProcessor } from "../calculator/wildcardProcessor";
import { ChangeType, Difference } from "./difference";
import { PersistableEntity } from "../../utils/persistence/persistableEntity";

export enum HolderType {
    USER,
    GROUP
}

export interface BaseSerializedData {
    id: string;
    type: HolderType;
    nodes: SerializedPermissionNode[];
    parents: string[];
}

export interface GroupSerializedData {
    displayName: string;
    weight: number;
}

export interface UserSerializedData {

}

export type SerializedData = BaseSerializedData & (GroupSerializedData | UserSerializedData);

export type Tristate = boolean | undefined;

export abstract class PermissionHolder extends PersistableEntity {
    public readonly identifier: string;

    protected nodeMap = new Map<string, PermissionNode>();
    protected wildcardMap = new Map<string, PermissionNode>();
    protected inheritanceMap = new Map<string, Group>();
    protected cache = new Map<string, Tristate>;

    public readonly permissionChanges = new Difference<PermissionNode>(
        (a, b) => a.equals(b)
    );

    public readonly inheritanceChanges = new Difference<string>();

    protected constructor(identifier: string) {
        this.identifier = identifier;
    }

    public abstract getType(): HolderType;

    protected abstract getSpecificData(): GroupSerializedData | UserSerializedData;

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
        //TODO add an enum with possible reasons the permission node couldn't be added?

        if (this.nodeMap.has(permission)) {
            const oldNode = this.nodeMap.get(permission)!;
            if (oldNode.equals(permissionNode)) return false;

            // If the node already exists but with a different value, the old node will be overridden
            this.permissionChanges.recordChange(ChangeType.REMOVE, oldNode);
        } else if (this.wildcardMap.has(permission)) {
            const oldNode = this.wildcardMap.get(permission)!;
            if (oldNode.equals(permissionNode)) return false;

            this.permissionChanges.recordChange(ChangeType.REMOVE, oldNode);
        }

        if (permissionNode.isWildcard()) {
            this.wildcardMap.set(permission, permissionNode);
            this.cache.clear();
        } else {
            this.nodeMap.set(permission, permissionNode);
            this.cache.set(permission, permissionNode.value);
        }

        this.permissionChanges.recordChange(ChangeType.ADD, permissionNode);
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

    export(): SerializedData { //TODO implement a Difference class to only save new changes
        const allNodes = [
            ...Array.from(this.nodeMap.values()),
            ...Array.from(this.wildcardMap.values())
        ].map(node => node.export());
        const parents: string[] = Array.from(this.inheritanceMap.keys());
        // TODO para guardar los nodos con lo de los changes guardar los strings de los permissions en nodes como keys y dentro de las keys el value del nodo
        const baseData: BaseSerializedData = {
            id: this.identifier,
            type: this.getType(),
            nodes: allNodes,
            parents
        };

        return {
            ...baseData,
            ...this.getSpecificData()
        };
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