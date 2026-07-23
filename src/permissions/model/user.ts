import { HolderType, PermissionHolder, UserSerializedData } from "./permissionHolder";
import { DirtyListener } from "../../utils/persistence/persistableEntity";
import { Player, world } from "@minecraft/server";

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

    getPlayer(): Player | undefined {
        return world.getPlayers({ name: this.identifier })[0];
    }
}