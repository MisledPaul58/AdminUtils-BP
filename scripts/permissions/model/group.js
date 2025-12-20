import { HolderType, PermissionHolder } from "./permissionHolder";
export class Group extends PermissionHolder {
    displayName;
    weight;
    constructor(identifier, displayName, weight) {
        super(identifier);
        this.displayName = displayName;
        this.weight = weight;
    }
    getType() {
        return HolderType.GROUP;
    }
    getSpecificData() {
        return {
            displayName: this.displayName,
            weight: this.weight
        };
    }
}
