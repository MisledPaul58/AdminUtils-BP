import { world } from "@minecraft/server";
import { convertToRegExpFriendly } from "../main";

export class Database {
    
    #tableName;
    #memory;

    constructor(tableName) {
        this.#tableName = tableName;
        this.#memory = this.#fetch();
    }

    #fetch() {
        const regexp = new RegExp(`^\\d+_${convertToRegExpFriendly(this.#tableName)}$`);
        const properties = world.getDynamicPropertyIds();
        let tableProperties = [];
        for (let i = 0; i < properties.length; i++) {
            if (regexp.test(properties[i])) tableProperties.push(properties[i]);
        }

        if (tableProperties.length === 0) return {};
        let table = "";
        for (const property of tableProperties) {
            table += world.getDynamicProperty(property);
        }
        return JSON.parse(table);
    }

    /**
     * Sets the specified `key` to the given `value` in the database table.
     * @param { String } key 
     * @param { {} } value 
     */
    set(key, value) {
        if (!this.#memory) throw new Error("Data tried to be set before load!");
        this.#memory[key] = value;
        this.#saveData();
        return this;
    }

    /**
     * Gets a value from this table.
     * @param { String } key 
     * @returns the value associated with the given key in the database table.
     */
    get(key) {
        if (!this.#memory) throw new Error("Data not loaded!");
        return this.#memory[key];
    }

    /**
     * Gets all the keys in the table.
     * @returns { String[] }
     */
    keys() {
        if (!this.#memory) throw new Error("Data not loaded!");
        return Object.keys(this.#memory);
    }

    /**
     * Gets all the values in the table.
     * @returns { [] } values in the table
     */
    values() {
        if (!this.#memory) throw new Error("Data not loaded!");
        return Object.values(this.#memory);
    }

    /**
     * Assign the values of an object to their respective keys in the database memory.
     * @param { Object } source
     */
    assign(source) {
        Object.assign(this.#memory, source);
        this.#saveData();
    }

    #saveData() {
        const regexp = new RegExp(`^\\d+_${convertToRegExpFriendly(this.#tableName)}$`);
        const properties = world.getDynamicPropertyIds();
        let oldChunksLength = 0;
        for (let i = 0; i < properties.length; i++) {
            if (regexp.test(properties[i])) oldChunksLength++;
        }
        
        const chunks = JSON.stringify(this.#memory).match(/.{1,30000}/g);
        for (const i in chunks) {
            world.setDynamicProperty(`${i}_${this.#tableName}`, chunks[i]);
        }
        if (oldChunksLength > chunks.length) {
            for (let i = chunks.length; i < oldChunksLength; i++) { //Delete the old tables from the old chunks
                world.setDynamicProperty(`${i}_${this.#tableName}`, undefined);
            }
        }
    }

    /**
     * Checks if the key exists in the table.
     * @param { String } key 
     * @returns { Boolean }
     */
    has(key) {
        if (!this.#memory) throw new Error("Data not loaded!");
        return Object.keys(this.#memory).includes(key);
    }

    /**
     * Deletes a key from the table.
     * @param { String } key 
     */
    delete(key) {
        if (!this.#memory) return false;
        const status = delete this.#memory[key];
        this.#saveData();
        return status;
    }

    /**
     * Delete all the keys from the table.
     */
    deleteAll() {
        if (!this.#memory) throw new Error("Data not loaded!");

        this.#memory = {};
        this.#saveData();
        return true;
    }
    
    /**
     * Returns the table object with all its keys and values.
     * @returns { object }
     */
    getTable() {
        if (!this.#memory) throw new Error("Data not loaded!");
        return this.#memory;
    }

    /**
     * Gets the name of the table.
     * @returns { String }
     */
    getTableName() {
        if (!this.#memory) throw new Error("Data not loaded!");
        return this.#tableName;
    }
}