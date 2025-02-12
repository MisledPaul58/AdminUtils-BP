export class PermissionNode {
    constructor(permission, value, isWildcard) {
        this.permission = permission;
        this.value = value;
        this.isWildcard = isWildcard;
    }
}
