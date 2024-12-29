export default class Utils {
    static deepClone(obj, visited = new WeakMap()) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (visited.has(obj)) {
            return visited.get(obj);
        }
        if (obj instanceof Date) {
            return new Date(obj);
        }
        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }
        const clone = Array.isArray(obj) ? [] : {};
        visited.set(obj, clone);
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'function') {
                    clone[key] = obj[key].bind(clone);
                }
                else {
                    clone[key] = this.deepClone(obj[key], visited);
                }
            }
        }
        return clone;
    }
}
