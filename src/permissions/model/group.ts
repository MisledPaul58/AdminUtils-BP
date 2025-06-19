import { HolderType, PermissionHolder } from "./permissionHolder";

export class Group extends PermissionHolder {
    public readonly displayName: string;
    public readonly weight: number;

    constructor(identifier: string, displayName: string, weight: number) {
        super(identifier);
        this.displayName = displayName;
        this.weight = weight;
    }

    public getType(): HolderType {
        return HolderType.GROUP;
    }
}