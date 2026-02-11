import { system, world } from "@minecraft/server";
import { PersistableEntity } from "./persistableEntity";
import { EventEmitter } from "../../events/eventEmitter";

export class AutoSaveManager {
    private saveQueue = new Set<PersistableEntity>();
    private isSaving = false;

    constructor(eventSource: EventEmitter, intervalTicks: number = 60) {
        eventSource.on("ready", () => {
           system.runInterval(() => this.processQueue(), intervalTicks);

           // Save before the world closes TODO is this actually necessary? Also, servers?
           world.beforeEvents.playerLeave.subscribe((event) => {
               if (world.getAllPlayers().length === 1 && world.getAllPlayers()[0] === event.player) {
                   this.flush();
               }
           });
        });
    }

    public onEntityDirty = (entity: PersistableEntity): void => {
        this.saveQueue.add(entity);
    }

    private processQueue() {
        if (this.isSaving || this.saveQueue.size === 0) return;

        this.isSaving = true;

        const queueSnapshot = Array.from(this.saveQueue);
        this.saveQueue.clear();

        for (const entity of queueSnapshot) {
            try {
                const success = entity.save();
                if (success) {
                    entity.markClean();
                } else {
                    // If it failed, add the entity to the queue again
                    this.saveQueue.add(entity);
                }
            } catch (e) {
                console.error(`Error auto-saving entity: ${e}`);
                this.saveQueue.add(entity);
            }
        }

        this.isSaving = false;
    }

    private flush() {
        for (const entity of this.saveQueue) {
            entity.save();
        }
    }
}