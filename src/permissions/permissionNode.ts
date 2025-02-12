export class PermissionNode {
    permission: string;
    value: boolean;
    isWildcard: boolean;

    constructor(permission: string, value: boolean, isWildcard: boolean) {
        this.permission = permission;
        this.value = value;
        this.isWildcard = isWildcard;
    }
}