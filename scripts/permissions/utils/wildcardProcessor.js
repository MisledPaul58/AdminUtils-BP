export class WildcardProcessor {
    static WILDCARD_SUFFIX = ".*";
    static ROOT_WILDCARD = "*";
    static isRootWildcard(permission) {
        return permission === this.ROOT_WILDCARD;
    }
    static isWildcardPermission(permission) {
        return this.isRootWildcard(permission) || (permission.endsWith(this.WILDCARD_SUFFIX) && permission.length > 2);
    }
    static includesPermission(wildcard, permission) {
        if (this.isRootWildcard(permission))
            return true;
        const wildcardParts = wildcard.slice(0, -2).split(".");
        const permissionParts = permission.split(".");
        for (let i = 0; i < wildcardParts.length; i++) {
            // If permission.test and permission.test.test1.*, doesn't include
            if (!permissionParts[i])
                return false;
            // permission.fly and permission.build.*, doesn't include
            if (permissionParts[i] !== wildcardParts[i])
                return false;
            // essentials.fly.* and essentials.fly, doesn't include
            if (i === wildcardParts.length - 1 && i === permissionParts.length - 1)
                return false;
            // essentials.cmd.* and essentials.cmd.use, includes
            if (i === wildcardParts.length - 1 && i !== permissionParts.length - 1)
                return true;
        }
        return false;
    }
    static getIncludedPermissions(wildcard, permissions) {
        const includedPermissions = [];
        for (const permission of permissions) {
            if (this.includesPermission(wildcard, permission))
                includedPermissions.push(permission);
        }
        return includedPermissions;
    }
}
