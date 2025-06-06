export var HolderType;
(function (HolderType) {
    HolderType[HolderType["USER"] = 0] = "USER";
    HolderType[HolderType["GROUP"] = 1] = "GROUP";
})(HolderType || (HolderType = {}));
export class PermissionHolder {
    constructor(identifier) {
        this.nodeMap = new Map();
        this.inheritanceMap = new Map();
        this.identifier = identifier;
    }
}
