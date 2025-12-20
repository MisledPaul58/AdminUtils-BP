export type DirtyListener = (entity: PersistableEntity) => void;

export abstract class PersistableEntity {
    private onDirtyListener?: DirtyListener;
    private _isDirty: boolean = false;

    // ACEPTAMOS EL LISTENER EN EL CONSTRUCTOR
    protected constructor(onDirty?: DirtyListener) {
        this.onDirtyListener = onDirty;
    }

    // Mantenemos este por si acaso quieres cambiarlo en runtime (opcional)
    public setDirtyListener(listener: DirtyListener) {
        this.onDirtyListener = listener;
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

    public abstract save(): Promise<boolean>;
}