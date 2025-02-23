import { WildcardProcessor } from "./calculator/wildcardProcessor";
//TODO make it serializable
export class PermissionNode {
    constructor(permission, value) {
        this.permission = permission;
        this.value = value;
        this.wildcardLevel = WildcardProcessor.getWildcardLevel(permission);
    }
    isWildcard() {
        return this.wildcardLevel != -1;
    }
}
