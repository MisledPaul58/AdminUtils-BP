import { HolderType, PermissionHolder } from "./permissionHolder";
import { Cache } from "../cache";
export class User extends PermissionHolder {
    constructor(username) {
        super(username);
        this.cache = new Cache();
    }
    getType() {
        return HolderType.USER;
    }
}
