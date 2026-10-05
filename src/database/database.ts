import { world } from "@minecraft/server";
import { calculateChecksum } from "./checksum";

interface TableMeta {
    /** Number of chunks that make up the stored JSON. */
    l: number;
    /** Adler-32 checksum of the full serialized JSON string. */
    c: number;
}

export class Database<Schema extends Record<string, any>> {
    public readonly tableName: string;
    private memory: Partial<Schema>;
    private _isDirty: boolean = false;

    public static readonly CHUNK_SIZE = 30000;

    constructor(tableName: string) {
        this.tableName = tableName;
        this.memory = {};
    }

    /**
     * Returns true if there are in-memory changes that have not been persisted yet.
     */
    public get isDirty(): boolean {
        return this._isDirty;
    }

    /**
     * Generator that loads this table from Dynamic Properties.
     * Supports the current meta+checksum format and the legacy _length format.
     */
    public *fetch(): Generator<void, void, unknown> {
        // --- Current format: one atomic _meta property ---
        const metaRaw = world.getDynamicProperty(`db_${this.tableName}_meta`);
        if (typeof metaRaw === "string") {
            let meta: TableMeta;
            try {
                meta = JSON.parse(metaRaw);
            } catch (_) {
                return this.restoreOrWipe("Corrupted meta");
            }

            const { l: chunksLength, c: storedChecksum } = meta;

            let collectedData = "";
            for (let i = 0; i < chunksLength; i++) {
                const chunk = world.getDynamicProperty(`db_${this.tableName}_${i}`);
                if (typeof chunk !== "string") {
                    return this.restoreOrWipe(`Missing chunk ${i}`);
                }
                collectedData += chunk;
                yield;
            }

            if (calculateChecksum(collectedData) !== storedChecksum) {
                return this.restoreOrWipe("Checksum mismatch");
            }

            try {
                this.memory = JSON.parse(collectedData);
                this._isDirty = false;
                this.saveBackup(collectedData);
            } catch (_) {
                return this.restoreOrWipe("Error parsing JSON");
            }
            return;
        }

        // --- Legacy format: separate _length property (no checksum) ---
        const chunksLength = world.getDynamicProperty(`db_${this.tableName}_length`) ?? 0;
        if (typeof chunksLength !== "number") {
            console.warn(`[DATABASE]: '${this.tableName}' has improper setup. Wiping data.`);
            return this.wipe();
        }

        if (chunksLength <= 0) {
            this.memory = {};
            return;
        }

        console.warn(`[DATABASE]: Migrating '${this.tableName}' to checksum format...`);

        let collectedData = "";
        for (let i = 0; i < chunksLength; i++) {
            const dataChunk = world.getDynamicProperty(`db_${this.tableName}_${i}`);
            if (typeof dataChunk !== "string") {
                console.warn(`[DATABASE]: When fetching db_${this.tableName}_${i}, improper data was found. Wiping data.`);
                return this.wipe();
            }
            collectedData += dataChunk;
            yield;
        }

        if (!collectedData.startsWith("{") || !collectedData.endsWith("}")) {
            console.warn(`[DATABASE]: When fetching '${this.tableName}', improper data was found. Wiping data.`);
            return this.wipe();
        }

        try {
            this.memory = JSON.parse(collectedData);
            this._isDirty = false;
            // Persist immediately in new format and clean up legacy keys
            this.saveData();
            world.setDynamicProperty(`db_${this.tableName}_length`, undefined);
            console.warn(`[DATABASE]: '${this.tableName}' successfully migrated to checksum format.`);
        } catch (_) {
            console.warn(`[DATABASE]: Error parsing '${this.tableName}'s JSON. Wiping data.`);
            return this.wipe();
        }
    }

    /**
     * Persists the current in-memory state to Dynamic Properties.
     *
     * Write order for crash safety:
     *   1. Write all chunk data (overwrites existing slots).
     *   2. Atomically commit length + checksum in a single _meta property.
     *   3. Delete excess old chunks (if the new data is smaller).
     *
     * If Minecraft crashes between steps 1 and 2, the _meta still points to the
     * previous valid length, so the next fetch() will detect the checksum mismatch
     * and wipe rather than loading garbage.
     */
    public saveData(): boolean {
        let serialized: string;
        try {
            serialized = JSON.stringify(this.memory);
        } catch (e) {
            console.error(`[DATABASE]: Serialization failed for '${this.tableName}': ${e}`);
            return false;
        }

        const chunks = serialized.match(new RegExp(`.{1,${Database.CHUNK_SIZE}}`, "g")) ?? ["{}"];
        const checksum = calculateChecksum(serialized);

        // Read old chunk count to clean up excess chunks later
        let oldChunkCount = 0;
        const oldMetaRaw = world.getDynamicProperty(`db_${this.tableName}_meta`);
        if (typeof oldMetaRaw === "string") {
            try { oldChunkCount = (JSON.parse(oldMetaRaw) as TableMeta).l; } catch (_) {}
        }

        try {
            // Step 1: Write all chunks first (data exists before the pointer is updated)
            for (let i = 0; i < chunks.length; i++) {
                world.setDynamicProperty(`db_${this.tableName}_${i}`, chunks[i]);
            }

            // Step 2: Atomic commit — one property carries both length and checksum
            const meta: TableMeta = { l: chunks.length, c: checksum };
            world.setDynamicProperty(`db_${this.tableName}_meta`, JSON.stringify(meta));
        } catch (e) {
            console.error(`[DATABASE]: Failed to save '${this.tableName}': ${e}`);
            return false;
        }

        // Step 3: Delete excess old chunks (cleanup, non-critical)
        for (let i = chunks.length; i < oldChunkCount; i++) {
            try { world.setDynamicProperty(`db_${this.tableName}_${i}`, undefined); } catch (_) {}
        }

        this._isDirty = false;
        return true;
    }

    /**
     * Saves a snapshot of known-good serialized data to backup slots.
     */
    private saveBackup(serialized: string): void {
        const chunks = serialized.match(new RegExp(`.{1,${Database.CHUNK_SIZE}}`, "g")) ?? ["{}"];
        const checksum = calculateChecksum(serialized);

        let oldChunkCount = 0;
        const oldMetaRaw = world.getDynamicProperty(`db_${this.tableName}_bak_meta`);
        if (typeof oldMetaRaw === "string") {
            try { oldChunkCount = (JSON.parse(oldMetaRaw) as TableMeta).l; } catch (_) {}
        }

        try {
            for (let i = 0; i < chunks.length; i++) {
                world.setDynamicProperty(`db_${this.tableName}_bak_${i}`, chunks[i]);
            }
            const meta: TableMeta = { l: chunks.length, c: checksum };
            world.setDynamicProperty(`db_${this.tableName}_bak_meta`, JSON.stringify(meta));
        } catch (e) {
            console.warn(`[DATABASE]: Could not save backup for '${this.tableName}': ${e}`);
            return;
        }

        for (let i = chunks.length; i < oldChunkCount; i++) {
            try { world.setDynamicProperty(`db_${this.tableName}_bak_${i}`, undefined); } catch (_) {}
        }
    }

    /**
     * Attempts to load and verify data from backup slots.
     */
    private tryLoadBackup(): boolean {
        const metaRaw = world.getDynamicProperty(`db_${this.tableName}_bak_meta`);
        if (typeof metaRaw === "string") {
            let meta: TableMeta;
            try { meta = JSON.parse(metaRaw); } catch (_) { return false; }

            let collectedData = "";
            for (let i = 0; i < meta.l; i++) {
                const chunk = world.getDynamicProperty(`db_${this.tableName}_bak_${i}`);
                if (typeof chunk !== "string") return false;
                collectedData += chunk;
            }

            if (calculateChecksum(collectedData) !== meta.c) return false;

            try {
                this.memory = JSON.parse(collectedData);
                this._isDirty = true;
                return true;
            } catch (_) {
                return false;
            }
        }
        return false;
    }

    /**
     * Attempts to restore from backup on corruption; if backup is unavailable or corrupted, wipes data.
     */
    private restoreOrWipe(reason: string): void {
        console.warn(`[DATABASE]: ${reason} for '${this.tableName}'. Attempting backup restore...`);
        if (this.tryLoadBackup()) {
            console.warn(`[DATABASE]: Backup restored successfully for '${this.tableName}'. Re-persisting to main slot.`);
            this.saveData();
        } else {
            console.warn(`[DATABASE]: No valid backup found for '${this.tableName}'. Wiping data.`);
            this.wipe();
        }
    }

    /**
     * Sets the specified `key` to the given `value` in the database table.
     * Save is true by default.
     */
    set<K extends keyof Schema>(key: K, value: Schema[K], save: boolean = true): this {
        this.memory[key] = value;
        this._isDirty = true;
        if (save) this.saveData();
        return this;
    }

    /**
     * Gets a value from this table.
     * @returns the value associated with the given key in the database table.
     */
    get<K extends keyof Schema>(key: K): Schema[K] | undefined {
        return this.memory[key];
    }

    /**
     * Gets all the keys in the table.
     */
    keys(): (keyof Schema)[] {
        return Object.keys(this.memory);
    }

    /**
     * Gets all the values in the table.
     */
    values(): Schema[keyof Schema][] {
        return Object.values(this.memory) as Schema[keyof Schema][];
    }

    assign<K extends keyof Schema>(key: K, value: Partial<Schema[K]>, save: boolean = true): this {
        const data = this.memory[key];

        if (data === undefined) {
            this.memory[key] = value as Schema[K];
        } else if (typeof data === "object" && data !== null && !Array.isArray(data)) {
            Object.assign(data, value);
        } else {
            this.memory[key] = value as Schema[K];
        }

        this._isDirty = true;
        if (save) this.saveData();
        return this;
    }

    /**
     * Assigns the values of an object to their respective keys in the database memory.
     */
    assignMemory(source: Partial<Schema>, save: boolean = true) {
        Object.assign(this.memory, source);
        this._isDirty = true;
        if (save) this.saveData();
    }

    /**
     * Checks if the key exists in the table.
     */
    has<K extends keyof Schema>(key: K): boolean {
        return Object.prototype.hasOwnProperty.call(this.memory, key);
    }

    /**
     * Deletes a key from the table.
     */
    delete<K extends keyof Schema>(key: K, save: boolean = true): boolean {
        if (!this.has(key)) return false;
        delete this.memory[key];
        this._isDirty = true;
        if (save) this.saveData();
        return true;
    }

    /**
     * Clears all the keys in the table.
     */
    clear(save: boolean = true) {
        this.memory = {};
        this._isDirty = true;
        if (save) this.saveData();
    }

    /**
     * Deletes all the keys from the table and resets its data.
     */
    wipe() {
        this.memory = {};
        this._isDirty = false;
        const ids = world.getDynamicPropertyIds();
        for (const id of ids) {
            if (id.startsWith(`db_${this.tableName}`)) {
                try { world.setDynamicProperty(id, undefined); } catch (_) {}
            }
        }
    }

    /**
     * Returns the table object with all its keys and values.
     */
    getTable(): Partial<Schema> {
        return this.memory;
    }
}