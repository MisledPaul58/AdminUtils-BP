export class WildcardProcessor {
    static isRootWildcard(permission) {
        return permission === this.ROOT_WILDCARD;
    }
    static isWildcardPermission(permission) {
        return this.isRootWildcard(permission) || (permission.endsWith(this.WILDCARD_SUFFIX) && permission.length > 2);
    }
    static getWildcardLevel(permission) {
        if (!this.isWildcardPermission(permission))
            return -1;
        const level = parseInt(permission.charAt(permission.indexOf(this.ROOT_WILDCARD) + 1));
        if (Number.isNaN(level))
            return Infinity;
        return level;
    }
}
WildcardProcessor.WILDCARD_SUFFIX = ".*";
WildcardProcessor.ROOT_WILDCARD = "*";
