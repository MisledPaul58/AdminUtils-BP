import { HolderType, PermissionHolder } from "./permissionHolder";

export class Group extends PermissionHolder {
    private readonly name: string;
    private readonly identifier: string;

    constructor() {
        super();
    }

    public getType(): HolderType {
        return HolderType.GROUP;
    }
}