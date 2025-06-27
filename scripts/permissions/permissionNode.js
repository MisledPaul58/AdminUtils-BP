import { WildcardProcessor } from "./calculator/wildcardProcessor";
//TODO make it serializable
export class PermissionNode {
    constructor(permission, value) {
        this.NODE_SEPARATOR = ".";
        this.permission = permission;
        this.value = value;
        this.wildcardLevel = WildcardProcessor.isWildcardPermission(permission)
            ? Array.from(permission).filter(char => char === this.NODE_SEPARATOR).length
            : -1;
    }
    isWildcard() {
        return this.wildcardLevel !== -1;
    }
    export() {
    }
}
