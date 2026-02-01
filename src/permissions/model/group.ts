import { GroupSerializedData, HolderType, PermissionHolder } from "./permissionHolder";
import { DirtyListener } from "../../utils/persistence/persistableEntity";

export class Group extends PermissionHolder {
    public displayName: string;
    public weight: number;

    constructor(identifier: string, displayName: string, weight: number, onDirty: DirtyListener) {
        super(identifier, onDirty);
        this.displayName = displayName;
        this.weight = weight;
    }

    public getType(): HolderType {
        return HolderType.GROUP;
    }

    setDisplayName(displayName: string): boolean {
        if (this.displayName === displayName) return false;
        this.displayName = displayName;

        this.metadataChanged = true;
        this.markDirty();
        return true;
    }

    protected getSpecificData(): GroupSerializedData {
        return {
            displayName: this.displayName,
            weight: this.weight
        };
    }
}