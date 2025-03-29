import { HolderType, PermissionHolder } from "./permissionHolder";
export class Group extends PermissionHolder {
    constructor() {
        super();
    }
    getType() {
        return HolderType.GROUP;
    }
}
