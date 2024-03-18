import { world } from "@minecraft/server";
import { convertToRegExpFriendly } from "./main";

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
        object[key] = value;
        
        const chunks = JSON.stringify(object).match(/.{1,30000}/g);
        for (const i in chunks) {
            world.setDynamicProperty(`${i}_${table}`, chunks[i]);
        }
    }

    deleteTable(table) {
        const regexp = new RegExp(`^\\d+_${convertToRegExpFriendly(table)}$`);
        const properties = world.getDynamicPropertyIds().filter(property => regexp.test(property));
        for (const property of properties) {
            world.setDynamicProperty(property, undefined);
        }
    }

    /**
     * 
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
     * @param { String } table
     * @returns { object }
     */
    getTable(table) {
        const regexp = new RegExp(`^\\d+_${convertToRegExpFriendly(table)}$`);
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
}

export const database = new Database();