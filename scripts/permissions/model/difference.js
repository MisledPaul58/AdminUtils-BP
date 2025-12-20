export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["ADD"] = 0] = "ADD";
    ChangeType[ChangeType["REMOVE"] = 1] = "REMOVE";
})(ChangeType || (ChangeType = {}));
export class Change {
    type;
    value;
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
    inverse() {
        return new Change(this.type === ChangeType.ADD ? ChangeType.REMOVE : ChangeType.ADD, this.value);
    }
}
export class Difference {
    changes = [];
    areEqual;
    constructor(equalityChecker) {
        this.areEqual = equalityChecker ?? ((a, b) => a === b);
    }
    getChanges() {
        return [...this.changes];
    }
    getAdded() {
        return this.changes
            .filter(c => c.type === ChangeType.ADD)
            .map(c => c.value);
    }
    getRemoved() {
        return this.changes
            .filter(c => c.type === ChangeType.REMOVE)
            .map(c => c.value);
    }
    isEmpty() {
        return this.changes.length === 0;
    }
    clear() {
        this.changes = [];
    }
    recordChange(type, value) {
        const newChange = new Change(type, value);
        const inverse = newChange.inverse();
        // Find if the inverse action exists in the log
        const inverseIndex = this.changes.findIndex(c => c.type === inverse.type && this.areEqual(c.value, inverse.value));
        if (inverseIndex !== -1) {
            // They cancel each other out
            this.changes.splice(inverseIndex, 1);
        }
        else {
            this.changes.push(newChange);
        }
    }
}
