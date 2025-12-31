export class PersistableEntity {
    onDirtyListener;
    _isDirty = false;
    needsInitialSave = false;
    constructor(onDirty) {
        this.onDirtyListener = onDirty;
    }
    markAsNew() {
        this.needsInitialSave = true;
        this.markDirty();
    }
    markDirty() {
        if (this._isDirty)
            return;
        this._isDirty = true;
        this.onDirtyListener?.(this);
    }
    markClean() {
        this._isDirty = false;
    }
    isDirty() {
        return this._isDirty;
    }
}
