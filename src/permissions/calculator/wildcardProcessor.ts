export class WildcardProcessor {
    public static readonly WILDCARD_SUFFIX: string = ".*";
    public static readonly ROOT_WILDCARD: string = "*";

    public static isRootWildcard(permission: string): boolean {
        return permission === this.ROOT_WILDCARD;
    }

    public static isWildcardPermission(permission: string): boolean {
        return this.isRootWildcard(permission) || (permission.endsWith(this.WILDCARD_SUFFIX) && permission.length > 2);
    }

    public static getWildcardLevel(permission: string): number { //Eso no es un wildcard level
        if (!this.isWildcardPermission(permission)) return -1;

        const level = parseInt(permission.charAt(permission.indexOf(this.ROOT_WILDCARD) + 1));
        if (Number.isNaN(level)) return Infinity;
        return level;
    }
}