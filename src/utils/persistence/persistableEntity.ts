export type DirtyListener = (entity: PersistableEntity) => void;

export abstract class PersistableEntity {
    private readonly onDirtyListener?: DirtyListener;
    private _isDirty: boolean = false;
    protected needsInitialSave: boolean = false;

    protected constructor(onDirty?: DirtyListener) {
        this.onDirtyListener = onDirty;
    }

    public markAsNew(): void {
        this.needsInitialSave = true;
        this.markDirty();
    }

    protected markDirty(): void {
        if (this._isDirty) return;

        this._isDirty = true;
        this.onDirtyListener?.(this);
    }

    public markClean(): void {
        this._isDirty = false;
    }

    public isDirty(): boolean {
        return this._isDirty;
    }

    public abstract save(): boolean;
}