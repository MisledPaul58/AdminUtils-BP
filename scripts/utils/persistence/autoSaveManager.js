import { system, world } from "@minecraft/server";
export class AutoSaveManager {
    saveQueue = new Set();
    isSaving = false;
    constructor(eventSource, intervalTicks = 60) {
        eventSource.on("ready", () => {
            system.runInterval(() => this.processQueue(), intervalTicks);
            // Save before world closes
            world.beforeEvents.playerLeave.subscribe((event) => {
                if (world.getAllPlayers().length === 1 && world.getAllPlayers()[0] === event.player) {
                    this.flush();
                }
            });
        });
    }
    onEntityDirty = (entity) => {
        this.saveQueue.add(entity);
    };
    processQueue() {
        if (this.isSaving || this.saveQueue.size === 0)
            return;
        this.isSaving = true;
        const queueSnapshot = Array.from(this.saveQueue);
        this.saveQueue.clear();
        for (const entity of queueSnapshot) {
            try {
                const success = entity.save();
                if (success) {
                    entity.markClean();
                }
                else {
                    // If it failed, add the entity to the queue again
                    this.saveQueue.add(entity);
                }
            }
            catch (e) {
                console.error(`Error auto-saving entity: ${e}`);
                this.saveQueue.add(entity);
            }
        }
        this.isSaving = false;
    }
    flush() {
        for (const entity of this.saveQueue) {
            entity.save();
        }
    }
}
