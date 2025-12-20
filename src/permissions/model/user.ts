import { HolderType, PermissionHolder, UserSerializedData } from "./permissionHolder";

export class User extends PermissionHolder {
    constructor(username: string) {
        super(username);
    }

    public getType(): HolderType {
        return HolderType.USER;
    }

    protected getSpecificData(): UserSerializedData {
        return {};
    }
}