import { HolderType, PermissionHolder, UserSerializedData } from "./permissionHolder";
import { DirtyListener } from "../../utils/persistence/persistableEntity";

export class User extends PermissionHolder {
    constructor(username: string, onDirty: DirtyListener) {
        super(username, onDirty);
    }

    public getType(): HolderType {
        return HolderType.USER;
    }

    protected getSpecificData(): UserSerializedData {
        return {};
    }
}