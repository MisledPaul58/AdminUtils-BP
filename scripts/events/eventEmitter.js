export class EventEmitter {
    /**
     * @type Array
     */
    #callbacks;
    #maxCallbacks;

    constructor() {
        this.#callbacks = [];
        this.#maxCallbacks = 256;
    }

    on(eventName, callback) {
        this.#addCallback(eventName, callback);
        return this;
    }

    once(eventName, callback) {
        this.#addCallback(eventName, callback, true);
        return this;
    }

    off(eventName, callback) {
        this.#removeCallback(eventName, callback);
        return this;
    }

    emit(eventName, ...args) {
        let status = false;
        for (const callbackObject of this.#callbacks) {
            if (callbackObject.eventName === eventName) {
                if (callbackObject.once && callbackObject.executed) return;

                callbackObject.callback(...args);
                status = true;
                callbackObject.executed = true;
            }
        }

        return status;
    }

    #addCallback(eventName, callback, once = false) {
        const callbackCount = this.#callbackCount(eventName);
        if (callbackCount >= this.#maxCallbacks) {
            throw `Warning, possible EventEmitter memory leak detected and prevented. Current callbacks for the event ${eventName}: ${callbackCount}.`
        }

        const data = {
            eventName,
            callback,
            once,
            executed: false
        };
        this.#callbacks.push(data);
    }

    #removeCallback(eventName, callback) {
        if (typeof callback === "number") {
            this.#callbacks.splice(callback, 1);
        } else {
            const index = this.#callbacks.findIndex(callback => callback.eventName === eventName && callback.callback === callback);
            if (index !== -1) {
                this.#callbacks.splice(index, 1);
            }
        }
    }

    #callbackCount(eventName) {
        return eventName ? this.#callbacks.filter(callback => callback.eventName === eventName).length : this.#callbacks.length;
    }
}