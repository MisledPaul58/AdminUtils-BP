import { describe, expect, it } from "vitest";
import Utils from "../src/utils/utils";

describe("Utils.deepClone", () => {
    it("returns primitives unchanged", () => {
        expect(Utils.deepClone(5)).toBe(5);
        expect(Utils.deepClone("x")).toBe("x");
        expect(Utils.deepClone(null)).toBeNull();
    });

    it("deep clones nested objects and arrays", () => {
        const original = { a: 1, arr: [1, 2, { b: 3 }], nested: { c: 4 } };
        const clone = Utils.deepClone(original) as typeof original;

        expect(clone).toEqual(original);
        expect(clone).not.toBe(original);
        expect(clone.arr).not.toBe(original.arr);
        expect(clone.nested).not.toBe(original.nested);
    });

    it("clones Date and RegExp instances", () => {
        const date = new Date("2020-01-01T00:00:00Z");
        const cloned = Utils.deepClone({ date }) as { date: Date };
        expect(cloned.date).toBeInstanceOf(Date);
        expect(cloned.date.getTime()).toBe(date.getTime());
        expect(cloned.date).not.toBe(date);

        const regex = /abc/gi;
        const clonedRegex = Utils.deepClone({ regex }) as { regex: RegExp };
        expect(clonedRegex.regex).not.toBe(regex);
        expect(clonedRegex.regex.source).toBe("abc");
        expect(clonedRegex.regex.flags).toBe("gi");
    });

    it("preserves circular references without infinite recursion", () => {
        const original: { name: string; self?: unknown } = { name: "root" };
        original.self = original;

        const clone = Utils.deepClone(original) as typeof original;
        expect(clone.name).toBe("root");
        expect(clone.self).toBe(clone);
    });
});
