import { HolderType, PermissionHolder } from "./permissionHolder";
export class User extends PermissionHolder {
    constructor() {
        super();
    }
    getType() {
        return HolderType.USER;
    }
}
