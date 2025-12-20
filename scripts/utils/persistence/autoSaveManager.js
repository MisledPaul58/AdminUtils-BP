import { system, world } from "@minecraft/server";
export class AutoSaveManager {
    saveQueue = new Set();
    isSaving = false;
    constructor(intervalTicks = 60) {
        system.runInterval(() => this.processQueue(), intervalTicks); //TODO así no xd usar tick? pasándo el server como parámetro al constructor?
        // 2. Guardado de seguridad al cerrar el servidor
        world.beforeEvents.shutdown.subscribe(() => this.flush());
    }
    onEntityDirty(entity) {
        this.saveQueue.add(entity);
    }
    async processQueue() {
        if (this.isSaving || this.saveQueue.size === 0)
            return;
        this.isSaving = true;
        const queueSnapshot = Array.from(this.saveQueue);
        this.saveQueue.clear();
        const promises = queueSnapshot.map(async (entity) => {
            try {
                const success = await entity.save();
                if (success) {
                    entity.markClean(); // Reseteamos su estado a limpio
                }
                else {
                    // Si falló, lo volvemos a meter en la cola para el siguiente ciclo
                    // (Opcional: añadir límite de reintentos)
                    this.saveQueue.add(entity);
                }
            }
            catch (e) {
                console.error(`Error auto-saving entity: ${e}`);
                this.saveQueue.add(entity);
            }
        });
        await Promise.all(promises);
        this.isSaving = false;
    }
    flush() {
        console.warn(`[AutoSaveManager] Flushing ${this.saveQueue.size} entities on shutdown...`);
        for (const entity of this.saveQueue) {
            entity.save();
        }
    }
}
