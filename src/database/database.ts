import { world } from "@minecraft/server";
import { DatabaseName } from "./index";

type DatabasePrimitive = string | number | boolean;
type DatabaseArray = string[] | number[] | boolean[];
export type DatabaseObject = { [key: string]: DatabaseValue };
export type DatabaseValue =
    | DatabasePrimitive
    | DatabaseArray
    | DatabaseObject;

export type DatabaseMemory = { [key: string]: DatabaseValue };

export class Database {
    public readonly tableName: DatabaseName;
    private memory: DatabaseMemory;

    constructor(tableName: DatabaseName) {
        this.tableName = tableName;
        this.memory = {};
    }

    public *fetch(): Generator<string | object> {
        const chunksLength = world.getDynamicProperty(`db_${this.tableName}_length`) ?? 0;
        if (typeof chunksLength !== "number") {
            console.warn(`[DATABASE]: '${this.tableName}' has improper setup. Wiping data.`);

            return this.wipe();
        }

        if (chunksLength <= 0) return this.memory = {};

        let collectedData = "";
        for (let i = 0; i < chunksLength; i++) {
            const dataChunk = world.getDynamicProperty(`db_${this.tableName}_${i}`);
            if (typeof dataChunk !== "string") {
                console.warn(`[DATABASE]: When fetching db_${this.tableName}_${i}, improper data was found. Wiping data.`);

                return this.wipe();
            }

            yield collectedData += dataChunk;
        }

        if (!collectedData.startsWith("{") || !collectedData.endsWith("}")) {
            console.warn(`[DATABASE]: When fetching '${this.tableName}', improper data was found. Wiping data.`);

            return this.wipe();
        }
        yield this.memory = JSON.parse(collectedData);
    }

    saveData() {
        const chunks = JSON.stringify(this.memory).match(/.{1,30000}/g);
        if (!chunks?.[0]) return false;

        const oldChunksLength: number = world.getDynamicProperty(`db_${this.tableName}_length`) as number;
        const chunksLength: number = chunks.length;
        // Update chunks length
        world.setDynamicProperty(`db_${this.tableName}_length`, chunksLength);

        // Save the memory in stringified chunks
        for (const [i, chunk] of chunks.entries()) {
            world.setDynamicProperty(`db_${this.tableName}_${i}`, chunk);
        }

        if (oldChunksLength > chunksLength) {
            for (let i = chunksLength; i < oldChunksLength; i++) { //Delete the old chunks in case they aren't needed anymore because the data is smaller.
                world.setDynamicProperty(`db_${this.tableName}_${i}`, undefined);
            }
        }
        return true;
    }

    /**
     * Sets the specified `key` to the given `value` in the database table.
     * Save is true by default.
     */
    set(key: string, value: DatabaseValue, save: boolean = true): Database {
        this.memory[key] = value;
        if (save) this.saveData();
        return this;
    }

    /**
     * Gets a value from this table.
     * @returns the value associated with the given key in the database table.
     */
    get(key: string): DatabaseValue | undefined {
        return this.memory[key];
    }

    /**
     * Gets all the keys in the table.
     */
    keys(): string[] {
        return Object.keys(this.memory);
    }

    /**
     * Gets all the values in the table.
     */
    values(): DatabaseValue[] {
        return Object.values(this.memory);
    }

    assign(key: string, value: DatabaseValue, save: boolean = true): Database {
        let data = this.get(key);
        if (data === undefined) {
            data = {};
            this.memory[key] = data;
        }

        Object.assign(data, value);
        if (save) this.saveData();
        return this;
    }

    /**
     * Assigns the values of an object to their respective keys in the database memory.
     */
    assignMemory(source: DatabaseMemory) {
        Object.assign(this.memory, source);
        this.saveData();
    }

    /**
     * Checks if the key exists in the table.
     */
    has(key: string): boolean {
        return this.memory.hasOwnProperty(key); //TODO does Object.hasOwn work?
    }

    /**
     * Deletes a key from the table.
     */
    delete(key: string): boolean {
        if (!this.has(key)) return false;
        delete this.memory[key];
        this.saveData();
        return true;
    }

    /**
     * Clears all the keys in the table.
     */
    clear() {
        this.memory = {};
        this.saveData();
    }

    /**
     * Deletes all the keys from the table and resets its data.
     */
    wipe() {
        this.memory = {};
        const ids = world.getDynamicPropertyIds();
        for (const id of ids) {
            if (id.startsWith(`db_${this.tableName}`)) world.setDynamicProperty(id, undefined);
        }
    }
    
    /**
     * Returns the table object with all its keys and values.
     */
    getTable(): DatabaseMemory {
        return this.memory;
    }
}