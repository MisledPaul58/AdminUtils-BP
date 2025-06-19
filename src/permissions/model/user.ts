import { HolderType, PermissionHolder } from "./permissionHolder";

export class User extends PermissionHolder {
    constructor(username: string) {
        super(username);
    }

    public getType(): HolderType {
        return HolderType.USER;
    }
}