import { WildcardProcessor } from "./calculator/wildcardProcessor";
//TODO make it serializable
export class PermissionNode {
    // public readonly wildcardLevel: number;
    constructor(permission, value) {
        this.NODE_SEPARATOR = ".";
        this.permission = permission;
        this.value = value;
        this.isWildcard = WildcardProcessor.isWildcardPermission(permission);
        // this.wildcardLevel = WildcardProcessor.getWildcardLevel(permission);
    }
    // public isWildcard(): boolean {
    //     return this.wildcardLevel != -1;
    // }
    equals(other) {
    }
    export() {
    }
}
