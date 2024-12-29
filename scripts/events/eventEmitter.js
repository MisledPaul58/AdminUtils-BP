var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EventEmitter_instances, _EventEmitter_listeners, _EventEmitter_maxListeners, _EventEmitter_addListener, _EventEmitter_removeListener, _EventEmitter_listenerCount;
export class EventEmitter {
    constructor() {
        _EventEmitter_instances.add(this);
        /**
         * @type Array
         */
        _EventEmitter_listeners.set(this, void 0);
        _EventEmitter_maxListeners.set(this, void 0);
        __classPrivateFieldSet(this, _EventEmitter_listeners, [], "f");
        __classPrivateFieldSet(this, _EventEmitter_maxListeners, 256, "f");
    }
    on(eventName, listener) {
        __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_addListener).call(this, eventName, listener);
        return this;
    }
    once(eventName, listener) {
        __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_addListener).call(this, eventName, listener, true);
        return this;
    }
    off(eventName, listener) {
        __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_removeListener).call(this, eventName, listener);
        return this;
    }
    emit(eventName, ...args) {
        let status = false;
        for (const listenerObject of __classPrivateFieldGet(this, _EventEmitter_listeners, "f")) {
            if (listenerObject.eventName === eventName) {
                if (listenerObject.once && listenerObject.executed)
                    return;
                listenerObject.listener(...args);
                status = true;
                listenerObject.executed = true;
            }
        }
        return status;
    }
}
_EventEmitter_listeners = new WeakMap(), _EventEmitter_maxListeners = new WeakMap(), _EventEmitter_instances = new WeakSet(), _EventEmitter_addListener = function _EventEmitter_addListener(eventName, listener, once = false) {
    const listenerCount = __classPrivateFieldGet(this, _EventEmitter_instances, "m", _EventEmitter_listenerCount).call(this, eventName);
    if (listenerCount >= __classPrivateFieldGet(this, _EventEmitter_maxListeners, "f")) {
        throw `Warning, possible EventEmitter memory leak detected and prevented. Current listeners for the event ${eventName}: ${listenerCount}.`;
    }
    const data = {
        eventName,
        listener,
        once,
        executed: false
    };
    __classPrivateFieldGet(this, _EventEmitter_listeners, "f").push(data);
}, _EventEmitter_removeListener = function _EventEmitter_removeListener(eventName, listener) {
    if (typeof listener === "number") {
        __classPrivateFieldGet(this, _EventEmitter_listeners, "f").splice(listener, 1);
    }
    else {
        const index = __classPrivateFieldGet(this, _EventEmitter_listeners, "f").findIndex(listenerObject => listenerObject.eventName === eventName && listenerObject.listener === listenerObject);
        if (index !== -1) {
            __classPrivateFieldGet(this, _EventEmitter_listeners, "f").splice(index, 1);
        }
    }
}, _EventEmitter_listenerCount = function _EventEmitter_listenerCount(eventName) {
    return eventName ? __classPrivateFieldGet(this, _EventEmitter_listeners, "f").filter(listener => listener.eventName === eventName).length : __classPrivateFieldGet(this, _EventEmitter_listeners, "f").length;
};
