import { PermissionNode } from "../permissionNode";

export enum HolderType {
    USER,
    GROUP
}

export abstract class PermissionHolder<T extends PermissionHolder<T>> {
    public readonly identifier: string;

    protected nodeMap = new Map<string, PermissionNode>();
    protected inheritanceMap = new Map<string, T>();

    protected constructor(identifier: string) {
        this.identifier = identifier;
    }

    public abstract getType(): HolderType;
}