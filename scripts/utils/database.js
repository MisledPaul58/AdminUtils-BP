import { world } from "@minecraft/server";
import { convertToRegExpFriendly } from "../main";

class Database {
    /**
     * @param { String } name 
     */
    createTable(name) {
        if (!this.tableExists(name)) {
            world.setDynamicProperty(`0_${name}`, "{}");
        }
    }

    /**
     * Sets a value in the table with a certain key. Creates the table if it doesn't exist.
     * @param { String } table
     * @param { String } key
     * @param { String} value
     */
    set(table, key, value) {
        this.createTable(table);
        let object = this.getTable(table);
        const oldChunks = JSON.stringify(object).match(/.{1,30000}/g);
        object[key] = value;
        
        const chunks = JSON.stringify(object).match(/.{1,30000}/g);
        for (const i in chunks) {
            world.setDynamicProperty(`${i}_${table}`, chunks[i]);
        }
        if (oldChunks.length > chunks.length) {
            for (let i = chunks.length; i < oldChunks.length; i++) { //Delete the old tables from the old chunks
                world.setDynamicProperty(`${i}_${table}`, undefined);
            }
        }
    }

    /**
     * Deletes the specified table with all its content.
     * @param { String } table
     */
    deleteTable(table) {
        if (!this.tableExists(table)) throw new Error("Database: tried to delete a table that doesn't exist.");
        const regexp = new RegExp(`^\\d+_${convertToRegExpFriendly(table)}$`);
        const properties = world.getDynamicPropertyIds().filter(property => regexp.test(property));
        for (const property of properties) {
            world.setDynamicProperty(property, undefined);
        }
    }

    /**
     * Deletes a key from a table.
     * @param { String } table 
     * @param { String } key 
     */
    deleteKey(table, key) {
        if (!this.tableExists(table)) throw new Error("Database: tried to delete a key from a table that doesn't exist.");
        let object = this.getTable(table);
        if (!Object.keys(object).includes(key)) throw new Error("Database: tried to delete a key that doesn't exist.");
        const oldChunks = JSON.stringify(object).match(/.{1,30000}/g);
        delete object[key];

        const chunks = JSON.stringify(object).match(/.{1,30000}/g);
        for (const i in chunks) {
            world.setDynamicProperty(`${i}_${table}`, chunks[i]);
        }
        if (oldChunks.length > chunks.length) {
            for (let i = chunks.length; i < oldChunks.length; i++) { //Delete the old tables from the old chunks
                world.setDynamicProperty(`${i}_${table}`, undefined);
            }
        }
    }

    /**
     * Returns the names of all the tables.
     * @returns { String[] }
     */
    getTables() {
        const properties = world.getDynamicPropertyIds();
        const tables = properties.reduce(function (accumulator, currentValue) {
            const property = currentValue.match(/(?<=^\d+_).+/)[0]; //1_Freecam, returns Freecam
            if (accumulator.indexOf(property) === -1) {
                accumulator.push(property);
            }
            return accumulator;
        }, []);
        return tables;
    }

    /**
     * Returns the table object.
     * @param { String } tableName
     * @returns { object }
     */
    getTable(tableName) {
        const regexp = new RegExp(`^\\d+_${convertToRegExpFriendly(tableName)}$`);
        const properties = world.getDynamicPropertyIds().filter(property => regexp.test(property));
        let table = "";
        for (const property of properties) {
            table += world.getDynamicProperty(property);
        }
        return JSON.parse(table);
    }

    /**
     * 
     * @param { String } table 
     * @returns { Boolean }
     */
    tableExists(table) {
        return this.getTables().includes(table);
    }

    /**
     * 
     * @param { String } table 
     * @param { String } key 
     */
    keyExists(table, key) {
        return Object.keys(database.getTable(table)).includes(key);
    }
}

export const database = new Database();