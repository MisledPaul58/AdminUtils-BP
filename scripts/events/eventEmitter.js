export class EventEmitter {
    listeners;
    maxListeners;
    constructor() {
        this.listeners = [];
        this.maxListeners = 256;
    }
    on(eventName, listener) {
        this.#addListener(eventName, listener);
        return this;
    }
    once(eventName, listener) {
        this.#addListener(eventName, listener, true);
        return this;
    }
    off(eventName, listenerOrIndex) {
        this.#removeListener(eventName, listenerOrIndex);
        return this;
    }
    emit(eventName, ...args) {
        let status = false;
        for (const listenerObject of this.listeners) {
            if (listenerObject.eventName === eventName) {
                if (listenerObject.once && listenerObject.executed)
                    return status;
                listenerObject.listener(...args);
                status = true;
                listenerObject.executed = true;
            }
        }
        return status;
    }
    #addListener(eventName, listener, once = false) {
        const listenerCount = this.#listenerCount(eventName);
        if (listenerCount >= this.maxListeners) {
            throw `Warning, possible EventEmitter memory leak detected and prevented. Current listeners for the event ${eventName}: ${listenerCount}.`;
        }
        const data = {
            eventName,
            listener,
            once,
            executed: false
        };
        this.listeners.push(data);
    }
    #removeListener(eventName, listenerOrIndex) {
        if (typeof listenerOrIndex === "number") {
            this.listeners.splice(listenerOrIndex, 1);
        }
        else {
            const index = this.listeners.findIndex(listenerObject => listenerObject.eventName === eventName && listenerObject.listener === listenerOrIndex);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        }
    }
    #listenerCount(eventName) {
        return eventName ? this.listeners.filter(listener => listener.eventName === eventName).length : this.listeners.length;
    }
}
