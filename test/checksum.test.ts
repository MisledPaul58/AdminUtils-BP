import { describe, expect, it } from "vitest";
import { calculateChecksum } from "../src/database/checksum";

describe("calculateChecksum (Adler-32)", () => {
    it("returns 1 for the empty string", () => {
        // a = 1, b = 0 -> (0 << 16) | 1
        expect(calculateChecksum("")).toBe(1);
    });

    it("matches a known value for a single character", () => {
        // "a" = 97: a = 98, b = 98 -> (98 << 16) | 98
        expect(calculateChecksum("a")).toBe(6422626);
    });

    it("always returns an unsigned 32-bit integer", () => {
        const samples = ["", "a", "hello world", "x".repeat(1000), "\u00e9\u00e9\u00e9"];
        for (const sample of samples) {
            const value = calculateChecksum(sample);
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(0xffffffff);
        }
    });

    it("is deterministic and changes when the input changes", () => {
        expect(calculateChecksum("abc")).toBe(calculateChecksum("abc"));
        expect(calculateChecksum("abc")).not.toBe(calculateChecksum("abd"));
    });
});
