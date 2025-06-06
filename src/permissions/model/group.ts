import { HolderType, PermissionHolder } from "./permissionHolder";
import { Cache } from "../cache";

export class Group extends PermissionHolder<Group> {
    public cache = new Cache<Group>();

    constructor(identifier: string, public displayName: string, public weight: number) {
        super(identifier);
    }

    public getType(): HolderType {
        return HolderType.GROUP;
    }
}