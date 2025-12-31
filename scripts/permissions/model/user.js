import { HolderType, PermissionHolder } from "./permissionHolder";
export class User extends PermissionHolder {
    constructor(username, onDirty) {
        super(username, onDirty);
    }
    getType() {
        return HolderType.USER;
    }
    getSpecificData() {
        return {};
    }
}
