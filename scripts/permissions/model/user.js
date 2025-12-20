import { HolderType, PermissionHolder } from "./permissionHolder";
export class User extends PermissionHolder {
    constructor(username) {
        super(username);
    }
    getType() {
        return HolderType.USER;
    }
    getSpecificData() {
        return {};
    }
}
