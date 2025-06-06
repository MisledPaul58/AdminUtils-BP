import { HolderType, PermissionHolder } from "./permissionHolder";
import { Cache } from "../cache";
export class Group extends PermissionHolder {
    constructor(identifier, displayName, weight) {
        super(identifier);
        this.displayName = displayName;
        this.weight = weight;
        this.cache = new Cache();
    }
    getType() {
        return HolderType.GROUP;
    }
}
