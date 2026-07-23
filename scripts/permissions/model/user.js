import { HolderType, PermissionHolder } from "./permissionHolder";
import { world } from "@minecraft/server";
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
    getPlayer() {
        return world.getPlayers({ name: this.identifier })[0];
    }
}
