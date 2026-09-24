import { WildcardProcessor } from "../utils/wildcardProcessor";
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
    equals(other) {
        return this.permission === other.permission && this.value === other.value;
    }
    export() {
        return {
            permission: this.permission,
            value: this.value
        };
    }
}
