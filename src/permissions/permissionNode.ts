import { WildcardProcessor } from "./calculator/wildcardProcessor";

//TODO make it serializable
export class PermissionNode {
    public readonly NODE_SEPARATOR: string = ".";

    public readonly permission: string;
    public readonly value: boolean;
    public readonly isWildcard: boolean;
    // public readonly wildcardLevel: number;

    constructor(permission: string, value: boolean) {
        this.permission = permission;
        this.value = value;
        this.isWildcard = WildcardProcessor.isWildcardPermission(permission);
        // this.wildcardLevel = WildcardProcessor.getWildcardLevel(permission);
    }

    // public isWildcard(): boolean {
    //     return this.wildcardLevel != -1;
    // }

    public equals(other: PermissionNode): boolean {

    }

    public export() {

    }
}