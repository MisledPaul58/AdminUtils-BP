import { beforeEach, describe, expect, it } from "vitest";
import { __resetDynamicProperties, world } from "./mocks/server";
import { Database } from "../src/database/database";

/** Drains a generator (Database.fetch is a generator that yields between chunks). */
function exhaust(generator: Generator<unknown, unknown, unknown>): void {
    for (const _ of generator) {
        // no-op
    }
}

beforeEach(() => {
    __resetDynamicProperties();
});

describe("Database", () => {
    it("round-trips values through dynamic properties", () => {
        const original = new Database<{ foo: string; n: number }>("Test");
        original.set("foo", "bar");
        original.set("n", 42);

        const reloaded = new Database<{ foo: string; n: number }>("Test");
        exhaust(reloaded.fetch());

        expect(reloaded.get("foo")).toBe("bar");
        expect(reloaded.get("n")).toBe(42);
    });

    it("tracks dirty state and clears it after saving", () => {
        const db = new Database<{ a: number }>("Dirty");

        db.set("a", 1, false);
        expect(db.isDirty).toBe(true);

        expect(db.saveData()).toBe(true);
        expect(db.isDirty).toBe(false);
    });

    it("splits large payloads across multiple chunks", () => {
        const big = "x".repeat(70000);
        const db = new Database<{ blob: string }>("Big");
        db.set("blob", big);

        const meta = JSON.parse(world.getDynamicProperty("db_Big_meta") as string) as { l: number };
        expect(meta.l).toBeGreaterThan(1);

        const reloaded = new Database<{ blob: string }>("Big");
        exhaust(reloaded.fetch());
        expect(reloaded.get("blob")).toBe(big);
    });

    it("restores from the backup when the main data is corrupted", () => {
        const source = new Database<{ v: string }>("Corrupt");
        source.set("v", "hello");

        // Loading writes the backup snapshot.
        exhaust(new Database<{ v: string }>("Corrupt").fetch());

        // Corrupt the primary chunk.
        world.setDynamicProperty("db_Corrupt_0", "{corrupted");

        const recovered = new Database<{ v: string }>("Corrupt");
        exhaust(recovered.fetch());

        expect(recovered.get("v")).toBe("hello");
    });

    it("wipes only its own table when the backup is also unusable", () => {
        world.setDynamicProperty("db_Other_0", "keep-me");

        const db = new Database<{ a: number }>("WipeMe");
        db.set("a", 1);
        db.wipe();

        expect(db.get("a")).toBeUndefined();
        expect(world.getDynamicPropertyIds().some((id) => id.startsWith("db_WipeMe"))).toBe(false);
        expect(world.getDynamicProperty("db_Other_0")).toBe("keep-me");
    });

    it("migrates the legacy _length format to the checksum format", () => {
        world.setDynamicProperty("db_Legacy_length", 1);
        world.setDynamicProperty("db_Legacy_0", JSON.stringify({ a: 1 }));

        const db = new Database<{ a: number }>("Legacy");
        exhaust(db.fetch());

        expect(db.get("a")).toBe(1);
        expect(world.getDynamicProperty("db_Legacy_length")).toBeUndefined();
        expect(typeof world.getDynamicProperty("db_Legacy_meta")).toBe("string");
    });

    it("supports assign, has and delete", () => {
        const db = new Database<{ obj: { a: number } }>("Ops");
        db.assign("obj", { a: 1 });

        expect(db.has("obj")).toBe(true);
        expect(db.get("obj")).toEqual({ a: 1 });

        expect(db.delete("obj")).toBe(true);
        expect(db.has("obj")).toBe(false);
        expect(db.delete("obj")).toBe(false);
    });
});
