import { HolderType, PermissionHolder } from "./permissionHolder";

export class User extends PermissionHolder {
    private readonly username: string;

    constructor() {
        super();
    }

    public getType(): HolderType {
        return HolderType.USER;
    }
}