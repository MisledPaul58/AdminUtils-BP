export type EventName = "firstLoad" | "ready" | "tick";

type ListenerObject = { eventName: EventName, listener: Listener, once: boolean, executed: boolean };
type ListenerArg = { [key: string]: string | number | boolean };
type Listener = (...args: ListenerArg[]) => void;

export class EventEmitter {
    private listeners: ListenerObject[];
    private readonly maxListeners: number;

    constructor() {
        this.listeners = [];
        this.maxListeners = 256;
    }

    on(eventName: EventName, listener: Listener): EventEmitter {
        this.#addListener(eventName, listener);
        return this;
    }

    once(eventName: EventName, listener: Listener): EventEmitter {
        this.#addListener(eventName, listener, true);
        return this;
    }

    off(eventName: EventName, listenerOrIndex: Listener | number): EventEmitter {
        this.#removeListener(eventName, listenerOrIndex);
        return this;
    }

    emit(eventName: EventName, ...args: ListenerArg[]): boolean {
        let status = false;
        for (const listenerObject of this.listeners) {
            if (listenerObject.eventName === eventName) {
                if (listenerObject.once && listenerObject.executed) return status;

                listenerObject.listener(...args);
                status = true;
                listenerObject.executed = true;
            }
        }

        return status;
    }

    #addListener(eventName: EventName, listener: Listener, once: boolean = false): void {
        const listenerCount = this.#listenerCount(eventName);
        if (listenerCount >= this.maxListeners) {
            throw `Warning, possible EventEmitter memory leak detected and prevented. Current listeners for the event ${eventName}: ${listenerCount}.`
        }

        const data: ListenerObject = {
            eventName,
            listener,
            once,
            executed: false
        };
        this.listeners.push(data);
    }

    #removeListener(eventName: EventName, listenerOrIndex: Listener | number): void {
        if (typeof listenerOrIndex === "number") {
            this.listeners.splice(listenerOrIndex, 1);
        } else {
            const index = this.listeners.findIndex(listenerObject => listenerObject.eventName === eventName && listenerObject.listener === listenerOrIndex);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        }
    }

    #listenerCount(eventName: EventName): number {
        return eventName ? this.listeners.filter(listener => listener.eventName === eventName).length : this.listeners.length;
    }
}