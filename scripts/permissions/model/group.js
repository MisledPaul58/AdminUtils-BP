import { HolderType, PermissionHolder } from "./permissionHolder";
export class Group extends PermissionHolder {
    displayName;
    weight;
    constructor(identifier, displayName, weight, onDirty) {
        super(identifier, onDirty);
        this.displayName = displayName;
        this.weight = weight;
    }
    getType() {
        return HolderType.GROUP;
    }
    setDisplayName(displayName) {
        if (this.displayName === displayName)
            return false;
        this.displayName = displayName;
        this.metadataChanged = true;
        this.markDirty();
        return true;
    }
    getSpecificData() {
        return {
            displayName: this.displayName,
            weight: this.weight
        };
    }
}
