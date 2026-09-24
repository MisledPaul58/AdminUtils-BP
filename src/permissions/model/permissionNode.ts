import { WildcardProcessor } from "../utils/wildcardProcessor";

export interface SerializedPermissionNode {
    permission: string;
    value: boolean;
}

export class PermissionNode {
    public readonly NODE_SEPARATOR: string = ".";

    public readonly permission: string;
    public readonly value: boolean;
    public readonly wildcardLevel: number;

    constructor(permission: string, value: boolean) {
        this.permission = permission;
        this.value = value;
        this.wildcardLevel = WildcardProcessor.isWildcardPermission(permission)
            ? Array.from(permission).filter(char => char === this.NODE_SEPARATOR).length
            : -1;
    }

    public isWildcard(): boolean {
        return this.wildcardLevel !== -1;
    }

    public equals(other: PermissionNode): boolean {
        return this.permission === other.permission && this.value === other.value;
    }

    public export(): SerializedPermissionNode {
        return {
            permission: this.permission,
            value: this.value
        }
    }
}