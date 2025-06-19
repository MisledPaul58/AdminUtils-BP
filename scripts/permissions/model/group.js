import { HolderType, PermissionHolder } from "./permissionHolder";
export class Group extends PermissionHolder {
    constructor(identifier, displayName, weight) {
        super(identifier);
        this.displayName = displayName;
        this.weight = weight;
    }
    getType() {
        return HolderType.GROUP;
    }
}
