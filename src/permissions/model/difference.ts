export enum ChangeType {
    ADD,
    REMOVE
}

export type EqualityChecker<T> = (a: T, b: T) => boolean;

export class Change<T> {
    public readonly type: ChangeType;
    public readonly value: T;

    constructor(type: ChangeType, value: T) {
        this.type = type;
        this.value = value;
    }

    inverse(): Change<T> {
        return new Change(
            this.type === ChangeType.ADD ? ChangeType.REMOVE : ChangeType.ADD,
            this.value
        );
    }
}

export class Difference<T> {
    private changes: Change<T>[] = [];
    private readonly areEqual: EqualityChecker<T>;

    constructor(equalityChecker?: EqualityChecker<T>) {
        this.areEqual = equalityChecker ?? ((a, b) => a === b);
    }

    public getChanges(): Change<T>[] {
        return [...this.changes];
    }

    public getAdded(): T[] {
        return this.changes
            .filter(c => c.type === ChangeType.ADD)
            .map(c => c.value);
    }

    public getRemoved(): T[] {
        return this.changes
            .filter(c => c.type === ChangeType.REMOVE)
            .map(c => c.value);
    }

    public isEmpty(): boolean {
        return this.changes.length === 0;
    }

    public clear(): void {
        this.changes = [];
    }

    public recordChange(type: ChangeType, value: T): void {
        const newChange = new Change(type, value);
        const inverse = newChange.inverse();

        // Find if the inverse action exists in the log
        const inverseIndex = this.changes.findIndex(
            c => c.type === inverse.type && this.areEqual(c.value, inverse.value)
        );

        if (inverseIndex !== -1) {
            // They cancel each other out
            this.changes.splice(inverseIndex, 1);
        } else {
            this.changes.push(newChange);
        }
    }
}