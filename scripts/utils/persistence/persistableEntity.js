export class PersistableEntity {
    onDirtyListener;
    _isDirty = false;
    // ACEPTAMOS EL LISTENER EN EL CONSTRUCTOR
    constructor(onDirty) {
        this.onDirtyListener = onDirty;
    }
    // Mantenemos este por si acaso quieres cambiarlo en runtime (opcional)
    setDirtyListener(listener) {
        this.onDirtyListener = listener;
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
