import { PermissionNode } from "./permissionNode";

export enum HolderType {
    USER,
    GROUP
}

export abstract class PermissionHolder {
    protected nodeMap: Map<string, PermissionNode>;
    protected inheritanceMap: Map<string, PermissionHolder>;

    protected constructor() {

    }

    public abstract getType(): HolderType;
}