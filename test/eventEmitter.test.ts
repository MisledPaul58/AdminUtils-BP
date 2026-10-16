import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "../src/events/eventEmitter";

describe("EventEmitter", () => {
    it("calls subscribed listeners with the emitted arguments", () => {
        const emitter = new EventEmitter();
        const spy = vi.fn();

        emitter.on("tick", spy);
        emitter.emit("tick", { a: 1 });

        expect(spy).toHaveBeenCalledWith({ a: 1 });
    });

    it("reports whether any listener handled the event", () => {
        const emitter = new EventEmitter();
        expect(emitter.emit("tick")).toBe(false);

        emitter.on("tick", () => {});
        expect(emitter.emit("tick")).toBe(true);
    });

    it("only invokes a once listener a single time", () => {
        const emitter = new EventEmitter();
        const spy = vi.fn();

        emitter.once("ready", spy);
        emitter.emit("ready");
        emitter.emit("ready");

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("removes a listener with off", () => {
        const emitter = new EventEmitter();
        const spy = vi.fn();

        emitter.on("tick", spy);
        emitter.off("tick", spy);
        emitter.emit("tick");

        expect(spy).not.toHaveBeenCalled();
    });

    it("does not notify listeners of a different event", () => {
        const emitter = new EventEmitter();
        const spy = vi.fn();

        emitter.on("tick", spy);
        emitter.emit("ready");

        expect(spy).not.toHaveBeenCalled();
    });

    // Regression test: emit() must skip an already-fired `once` listener and keep
    // notifying the listeners registered after it (it used to return early instead).
    it("keeps notifying other listeners after a once listener has fired", () => {
        const emitter = new EventEmitter();
        const onceSpy = vi.fn();
        const onSpy = vi.fn();

        emitter.once("tick", onceSpy);
        emitter.on("tick", onSpy);

        emitter.emit("tick");
        emitter.emit("tick");

        expect(onSpy).toHaveBeenCalledTimes(2);
    });
});
