import { beforeEach, describe, expect, it } from "vitest";
import { __resetDynamicProperties, world } from "./mocks/server";
import { Database } from "../src/database/database";
import { AUTO_BACKUP_MINUTES, BackupError, BackupManager, clampAutoBackupInterval, DEFAULT_MAX_BACKUPS, formatBackupDate } from "../src/database/backups";

function makeTables() {
    return {
        Alpha: new Database<Record<string, unknown>>("BackupTestAlpha"),
        Beta: new Database<Record<string, unknown>>("BackupTestBeta")
    };
}

/** Deterministic clock so backups created in the same millisecond keep a stable order. */
function clock(start: number = 1_000_000) {
    let current = start;
    return () => (current += 60_000);
}

beforeEach(() => {
    __resetDynamicProperties();
});

describe("BackupManager", () => {
    it("keeps ten backups by default", () => {
        expect(DEFAULT_MAX_BACKUPS).toBe(10);
    });

    it("clamps the automatic backup interval", () => {
        expect(clampAutoBackupInterval(undefined)).toBe(AUTO_BACKUP_MINUTES.default);
        expect(clampAutoBackupInterval(0)).toBe(AUTO_BACKUP_MINUTES.min);
        expect(clampAutoBackupInterval(999)).toBe(AUTO_BACKUP_MINUTES.max);
        expect(clampAutoBackupInterval(17)).toBe(15);
        expect(clampAutoBackupInterval(18)).toBe(20);
    });

    it("formats backup times in UTC", () => {
        const timestamp = Date.UTC(2026, 10, 8, 13, 32);
        expect(formatBackupDate(timestamp)).toBe("2026-11-08 13:32 UTC");
    });

    it("snapshots every table", () => {
        const tables = makeTables();
        tables.Alpha.set("a", 1);
        tables.Beta.set("b", "two");

        const manager = new BackupManager(tables, 5, clock());
        const result = manager.create("manual", "first");
        if (!result.ok) throw new Error(`create failed: ${result.error}`);

        const stored = manager.list();
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe("first");
        expect(stored[0].tables.sort()).toEqual(["Alpha", "Beta"]);
        expect(stored[0].checksum).toBeTypeOf("number");
    });

    it("restores the snapshot and stores a safety backup first", () => {
        const tables = makeTables();
        tables.Alpha.set("a", 1);
        tables.Beta.set("b", "two");

        const manager = new BackupManager(tables, 5, clock());
        const created = manager.create("manual", "snapshot");
        if (!created.ok) throw new Error(`create failed: ${created.error}`);

        tables.Alpha.set("a", 99);
        tables.Beta.set("b", "changed");

        const restored = manager.restore(created.backup.slot);
        if (!restored.ok) throw new Error(`restore failed: ${restored.error}`);

        expect(tables.Alpha.get("a")).toBe(1);
        expect(tables.Beta.get("b")).toBe("two");
        expect(restored.safetyBackup?.reason).toBe("safety");
        expect(manager.list().some(backup => backup.reason === "safety")).toBe(true);
    });

    it("deletes a backup and clears its dynamic properties", () => {
        const manager = new BackupManager(makeTables(), 5, clock());
        const created = manager.create("manual", "temporary");
        if (!created.ok) throw new Error(`create failed: ${created.error}`);

        expect(manager.delete(created.backup.slot)).toBe(true);
        expect(manager.list()).toHaveLength(0);
        expect(world.getDynamicPropertyIds().filter(id => id.startsWith("db_backup_slot_"))).toHaveLength(0);
        expect(manager.delete(created.backup.slot)).toBe(false);
    });

    it("keeps only the configured number of backups", () => {
        const manager = new BackupManager(makeTables(), 3, clock());

        for (let i = 0; i < 4; i++) {
            const result = manager.create("manual", `backup ${i}`);
            if (!result.ok) throw new Error(`create failed: ${result.error}`);
        }

        expect(manager.list().map(backup => backup.name)).toEqual(["backup 3", "backup 2", "backup 1"]);
    });

    it("does not evict the backup that is being restored", () => {
        const tables = makeTables();
        tables.Alpha.set("a", 1);

        const manager = new BackupManager(tables, 2, clock());
        const oldest = manager.create("manual", "oldest");
        const newer = manager.create("manual", "newer");
        if (!oldest.ok || !newer.ok) throw new Error("setup failed");

        tables.Alpha.set("a", 2);

        // With both slots full, the safety backup must reuse the newer slot.
        const restored = manager.restore(oldest.backup.slot);
        if (!restored.ok) throw new Error(`restore failed: ${restored.error}`);

        expect(manager.get(oldest.backup.slot)?.name).toBe("oldest");
        expect(manager.get(newer.backup.slot)?.name).toBe("Before restore");
        expect(tables.Alpha.get("a")).toBe(1);
    });

    it("refuses to restore a corrupted snapshot", () => {
        const tables = makeTables();
        tables.Alpha.set("a", 1);

        const manager = new BackupManager(tables, 5, clock());
        const created = manager.create("manual", "corrupted");
        if (!created.ok) throw new Error(`create failed: ${created.error}`);

        tables.Alpha.set("a", 2);
        world.setDynamicProperty(`db_backup_slot_${created.backup.slot}_0`, "{not valid");

        const result = manager.restore(created.backup.slot);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBe(BackupError.Corrupted);
        expect(tables.Alpha.get("a")).toBe(2);
    });

    it("ignores invalid metadata and cleans orphaned chunks", () => {
        const manager = new BackupManager(makeTables(), 5, clock());

        world.setDynamicProperty("db_backup_slot_0_meta", "{invalid");
        world.setDynamicProperty("db_backup_slot_0_99", "orphaned chunk");

        expect(manager.list()).toHaveLength(0);
        expect(manager.get(0)).toBeUndefined();

        const result = manager.create("manual", "fresh");
        if (!result.ok) throw new Error(`create failed: ${result.error}`);

        expect(manager.list()[0].name).toBe("fresh");
        expect(world.getDynamicProperty("db_backup_slot_0_99")).toBeUndefined();
    });
});
