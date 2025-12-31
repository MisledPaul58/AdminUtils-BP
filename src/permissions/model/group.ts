import { GroupSerializedData, HolderType, PermissionHolder } from "./permissionHolder";
import { DirtyListener } from "../../utils/persistence/persistableEntity";

export class Group extends PermissionHolder {
    public readonly displayName: string;
    public readonly weight: number;

    constructor(identifier: string, displayName: string, weight: number, onDirty: DirtyListener) {
        super(identifier, onDirty);
        this.displayName = displayName;
        this.weight = weight;
    }

    public getType(): HolderType {
        return HolderType.GROUP;
    }

    protected getSpecificData(): GroupSerializedData {
        return {
            displayName: this.displayName,
            weight: this.weight
        };
    }
}