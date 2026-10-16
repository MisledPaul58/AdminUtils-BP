import { describe, expect, it } from "vitest";
import { Change, ChangeType, Difference } from "../src/permissions/utils/difference";

describe("Difference", () => {
    it("records additions and removals", () => {
        const diff = new Difference<string>();
        diff.recordChange(ChangeType.ADD, "x");
        diff.recordChange(ChangeType.REMOVE, "y");

        expect(diff.getAdded()).toEqual(["x"]);
        expect(diff.getRemoved()).toEqual(["y"]);
        expect(diff.isEmpty()).toBe(false);
    });

    it("cancels an addition when the matching removal is recorded", () => {
        const diff = new Difference<string>();
        diff.recordChange(ChangeType.ADD, "x");
        diff.recordChange(ChangeType.REMOVE, "x");

        expect(diff.isEmpty()).toBe(true);
        expect(diff.getChanges()).toHaveLength(0);
    });

    it("keeps unrelated changes separate", () => {
        const diff = new Difference<string>();
        diff.recordChange(ChangeType.ADD, "x");
        diff.recordChange(ChangeType.ADD, "y");

        expect(diff.getAdded().sort()).toEqual(["x", "y"]);
    });

    it("supports a custom equality checker", () => {
        const diff = new Difference<{ id: number }>((a, b) => a.id === b.id);
        diff.recordChange(ChangeType.ADD, { id: 1 });
        diff.recordChange(ChangeType.REMOVE, { id: 1 });

        expect(diff.isEmpty()).toBe(true);
    });

    it("returns a defensive copy of the changes", () => {
        const diff = new Difference<string>();
        diff.recordChange(ChangeType.ADD, "x");

        const changes = diff.getChanges();
        changes.pop();

        expect(diff.getChanges()).toHaveLength(1);
    });

    it("clears all recorded changes", () => {
        const diff = new Difference<string>();
        diff.recordChange(ChangeType.ADD, "x");
        diff.clear();

        expect(diff.isEmpty()).toBe(true);
    });

    it("Change.inverse flips the change type", () => {
        const change = new Change(ChangeType.ADD, "x");
        expect(change.inverse().type).toBe(ChangeType.REMOVE);
        expect(change.inverse().value).toBe("x");
    });
});
