import { WildcardProcessor } from "./calculator/wildcardProcessor";
//TODO make it serializable
export class PermissionNode {
    NODE_SEPARATOR = ".";
    permission;
    value;
    wildcardLevel;
    constructor(permission, value) {
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
