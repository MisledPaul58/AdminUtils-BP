import { world } from "@minecraft/server";
export class Database {
    constructor(tableName) {
        this.tableName = tableName;
        this.memory = this.fetch();
    }
    fetch() {
        const chunksLength = world.getDynamicProperty(`db_${this.tableName}_length`) ?? 0;
        if (typeof chunksLength !== "number") {
            console.warn(`[DATABASE]: '${this.tableName}' has improper setup. Wiping data.`);
            this.wipe();
            return {};
        }
        if (chunksLength <= 0)
            return {};
        let collectedData = "";
        for (let i = 0; i < chunksLength; i++) {
            const dataChunk = world.getDynamicProperty(`db_${this.tableName}_${i}`);
            if (typeof dataChunk !== "string") {
                console.warn(`[DATABASE]: When fetching db_${this.tableName}_${i}, improper data was found. Wiping data.`);
                this.wipe();
                return {};
            }
            collectedData += dataChunk;
        }
        if (!collectedData.startsWith("{") || !collectedData.endsWith("}")) {
            console.warn(`[DATABASE]: When fetching '${this.tableName}', improper data was found. Wiping data.`);
            this.wipe();
            return {};
        }
        return JSON.parse(collectedData);
    }
    saveData() {
        const chunks = JSON.stringify(this.memory).match(/.{1,30000}/g);
        if (!chunks?.[0])
            return false;
        const oldChunksLength = world.getDynamicProperty(`db_${this.tableName}_length`);
        const chunksLength = chunks.length;
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
     */
    set(key, value, save = true) {
        if (!this.memory)
            throw new Error("Data tried to be set before load!");
        this.memory[key] = value;
        if (save) {
            this.saveData();
        }
        return this;
    }
    /**
     * Gets a value from this table.
     * @param { String } key
     * @returns the value associated with the given key in the database table.
     */
    get(key) {
        return this.memory[key];
    }
    /**
     * Gets all the keys in the table.
     * @returns { String[] }
     */
    keys() {
        return Object.keys(this.memory);
    }
    /**
     * Gets all the values in the table.
     * @returns { [] } values in the table
     */
    values() {
        return Object.values(this.memory);
    }
    /**
     * Assigns the values of an object to their respective keys in the database memory.
     * @param { Object } source
     */
    assign(source) {
        Object.assign(this.memory, source);
        this.saveData();
    }
    /**
     * Checks if the key exists in the table.
     * @param { String } key
     * @returns { Boolean }
     */
    has(key) {
        return Object.keys(this.memory).includes(key);
    }
    /**
     * Deletes a key from the table.
     * @param { String } key
     */
    delete(key) {
        if (!this.memory)
            return false;
        const status = delete this.memory[key];
        this.saveData();
        return status;
    }
    /**
     * Deletes all the keys from the table and resets its data.
     */
    wipe() {
        const ids = world.getDynamicPropertyIds();
        for (const id of ids) {
            if (id.startsWith(`db_${this.tableName}`))
                world.setDynamicProperty(id, undefined);
        }
    }
    /**
     * Clears all the keys in the table.
     */
    clear() {
        this.memory = {};
        this.saveData();
    }
    /**
     * Returns the table object with all its keys and values.
     * @returns { object }
     */
    getTable() {
        return this.memory;
    }
}
