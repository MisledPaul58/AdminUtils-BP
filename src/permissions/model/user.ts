import { HolderType, PermissionHolder } from "./permissionHolder";
import { Cache } from "../cache";

export class User extends PermissionHolder<User> {
    public cache = new Cache<User>();

    constructor(username: string) {
        super(username);
    }

    public getType(): HolderType {
        return HolderType.USER;
    }
}