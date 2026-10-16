import { describe, expect, it } from "vitest";
import { PermissionNode } from "../src/permissions/model/permissionNode";

describe("PermissionNode", () => {
    it("marks non-wildcard permissions with level -1", () => {
        const node = new PermissionNode("a.b", true);
        expect(node.isWildcard()).toBe(false);
        expect(node.wildcardLevel).toBe(-1);
    });

    it("counts separators to compute the wildcard level", () => {
        expect(new PermissionNode("a.*", true).wildcardLevel).toBe(1);
        expect(new PermissionNode("a.b.*", false).wildcardLevel).toBe(2);
        expect(new PermissionNode("*", true).wildcardLevel).toBe(0);
    });

    it("compares by permission and value", () => {
        expect(new PermissionNode("a", true).equals(new PermissionNode("a", true))).toBe(true);
        expect(new PermissionNode("a", true).equals(new PermissionNode("a", false))).toBe(false);
        expect(new PermissionNode("a", true).equals(new PermissionNode("b", true))).toBe(false);
    });

    it("exports its serialized form", () => {
        const node = new PermissionNode("a.*", false);
        expect(node.export()).toEqual({ permission: "a.*", value: false });
    });
});
