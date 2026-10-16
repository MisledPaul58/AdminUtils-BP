import { describe, expect, it } from "vitest";
import { WildcardProcessor } from "../src/permissions/utils/wildcardProcessor";

describe("WildcardProcessor", () => {
    it("identifies the root wildcard", () => {
        expect(WildcardProcessor.isRootWildcard("*")).toBe(true);
        expect(WildcardProcessor.isRootWildcard("a.*")).toBe(false);
        expect(WildcardProcessor.isRootWildcard("a")).toBe(false);
    });

    it("identifies wildcard permissions", () => {
        expect(WildcardProcessor.isWildcardPermission("*")).toBe(true);
        expect(WildcardProcessor.isWildcardPermission("a.*")).toBe(true);
        expect(WildcardProcessor.isWildcardPermission("a.b.*")).toBe(true);
        expect(WildcardProcessor.isWildcardPermission("a")).toBe(false);
        // ".*" is too short to be treated as a scoped wildcard
        expect(WildcardProcessor.isWildcardPermission(".*")).toBe(false);
    });

    it("includes a permission nested below a wildcard", () => {
        expect(WildcardProcessor.includesPermission("essentials.cmd.*", "essentials.cmd.use")).toBe(true);
        expect(WildcardProcessor.includesPermission("a.*", "a.b")).toBe(true);
        expect(WildcardProcessor.includesPermission("a.*", "a.b.c")).toBe(true);
    });

    it("does not include a permission from a different branch", () => {
        expect(WildcardProcessor.includesPermission("permission.build.*", "permission.fly")).toBe(false);
    });

    it("does not treat the wildcard target itself as included", () => {
        // essentials.fly.* should not match essentials.fly
        expect(WildcardProcessor.includesPermission("essentials.fly.*", "essentials.fly")).toBe(false);
    });

    it("filters an iterable of permissions", () => {
        const all = ["a.b", "a.c", "a.b.c", "d"];
        expect(WildcardProcessor.getIncludedPermissions("a.*", all)).toEqual(["a.b", "a.c", "a.b.c"]);
    });
});
