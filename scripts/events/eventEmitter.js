var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EventEmitter_instances, _EventEmitter_addListener, _EventEmitter_removeListener, _EventEmitter_listenerCount;
export class EventEmitter {
    constructor() {
        _EventEmitter_instances.add(this);
        this.listeners = [];
        this.maxListeners = 256;
    }
    on(eventName, listener) {
        __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_addListener).call(this, eventName, listener);
        return this;
    }
    once(eventName, listener) {
        __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_addListener).call(this, eventName, listener, true);
        return this;
    }
    off(eventName, listenerOrIndex) {
        __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_removeListener).call(this, eventName, listenerOrIndex);
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
}
_EventEmitter_instances = new WeakSet(), _EventEmitter_addListener = function _EventEmitter_addListener(eventName, listener, once = false) {
    const listenerCount = __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_listenerCount).call(this, eventName);
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
}, _EventEmitter_removeListener = function _EventEmitter_removeListener(eventName, listenerOrIndex) {
    if (typeof listenerOrIndex === "number") {
        this.listeners.splice(listenerOrIndex, 1);
    }
    else {
        const index = this.listeners.findIndex(listenerObject => listenerObject.eventName === eventName && listenerObject.listener === listenerOrIndex);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
}, _EventEmitter_listenerCount = function _EventEmitter_listenerCount(eventName) {
    return eventName ? this.listeners.filter(listener => listener.eventName === eventName).length : this.listeners.length;
};
