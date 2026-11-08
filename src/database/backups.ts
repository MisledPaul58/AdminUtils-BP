import { system, world } from "@minecraft/server";
import { calculateChecksum } from "./checksum";
import { Database, getDatabaseRevision } from "./database";
import { DB, DBManager, GenericSchema } from "./databaseManager";

export type BackupReason = "manual" | "auto" | "safety";

export interface BackupMeta {
    version: 1;
    name: string;
    createdAt: number;
    reason: BackupReason;
    /** Number of dynamic-property chunks that hold the snapshot. */
    chunks: number;
    /** Adler-32 checksum of the full serialized snapshot. */
    checksum: number;
    /** Snapshot size in characters (approximately bytes). */
    bytes: number;
    tables: string[];
}

export interface Backup extends BackupMeta {
    slot: number;
}

export enum BackupError {
    NoSpace = "noSpace",
    WriteFailed = "writeFailed",
    Corrupted = "corrupted"
}

export type BackupResult =
    | { ok: true; backup: Backup; safetyBackup?: Backup }
    | { ok: false; error: BackupError };

type TableMap = Record<string, Database<GenericSchema>>;

/** Slots kept before the oldest backup is replaced. */
export const DEFAULT_MAX_BACKUPS = 10;

/** Bounds and default for the configurable automatic-backup interval. */
export const AUTO_BACKUP_MINUTES = {
    min: 5,
    max: 240,
    step: 5,
    default: 30
} as const;

/** The scheduler wakes up once a minute and enforces the configured interval. */
const AUTO_BACKUP_CHECK_TICKS = 20 * 60;
const SLOT_PREFIX = "db_backup_slot_";
const META_SUFFIX = "meta";
const MAX_NAME_LENGTH = 32;

const REASONS: Record<BackupReason, { label: string; defaultName: string }> = {
    manual: { label: "Manual", defaultName: "Manual backup" },
    auto: { label: "Automatic", defaultName: "Automatic backup" },
    safety: { label: "Before restore", defaultName: "Before restore" }
};

/** User-facing label for a backup reason. */
export function backupReasonName(reason: BackupReason): string {
    return REASONS[reason].label;
}

/** Formats a timestamp as `YYYY-MM-DD HH:MM UTC`. Bedrock's runtime reports time in UTC. */
export function formatBackupDate(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (value: number) => value.toString().padStart(2, "0");

    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/** Formats a character count in a compact, human-readable way. */
export function formatBackupSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Clamps and snaps an interval to the configured slider range. */
export function clampAutoBackupInterval(minutes: unknown): number {
    const value = typeof minutes === "number" && Number.isFinite(minutes)
        ? minutes
        : AUTO_BACKUP_MINUTES.default;
    const stepped = Math.round(value / AUTO_BACKUP_MINUTES.step) * AUTO_BACKUP_MINUTES.step;

    return Math.min(AUTO_BACKUP_MINUTES.max, Math.max(AUTO_BACKUP_MINUTES.min, stepped));
}

/** Reads the configured automatic-backup interval, falling back to the default. */
export function getAutoBackupIntervalMinutes(): number {
    return clampAutoBackupInterval(DB.Config.get("autoBackupIntervalMinutes"));
}

/**
 * Manages full-database snapshots stored in dynamic properties.
 *
 * Every backup captures all tables at once, so restoring one always produces a
 * consistent database state. A maximum of `maxBackups` snapshots are kept; when
 * the limit is reached the oldest one is replaced.
 *
 * Storage layout per slot:
 *   - `db_backup_slot_<slot>_meta`  JSON metadata (commit point)
 *   - `db_backup_slot_<slot>_<i>`   chunk `i` of the serialized snapshot
 */
export class BackupManager {
    public readonly maxBackups: number;
    private readonly tables: TableMap;
    private readonly now: () => number;
    private autoBackupTimer: number | undefined;
    private lastAutoRevision = 0;
    private lastAutoBackupAt = 0;

    constructor(
        tables: TableMap = DBManager.tables as unknown as TableMap,
        maxBackups: number = DEFAULT_MAX_BACKUPS,
        now: () => number = Date.now
    ) {
        this.tables = tables;
        this.maxBackups = Math.max(1, Math.floor(maxBackups));
        this.now = now;
    }

    /** Returns every stored backup, newest first. */
    public list(): Backup[] {
        const backups: Backup[] = [];

        for (let slot = 0; slot < this.maxBackups; slot++) {
            const meta = this.readMeta(slot);
            if (meta) backups.push({ ...meta, slot });
        }

        return backups.sort((a, b) => b.createdAt - a.createdAt);
    }

    /** Returns a single backup, or undefined when the slot is empty. */
    public get(slot: number): Backup | undefined {
        if (!this.isValidSlot(slot)) return undefined;
        const meta = this.readMeta(slot);
        return meta ? { ...meta, slot } : undefined;
    }

    /**
     * Creates a snapshot of the whole database.
     *
     * When every slot is occupied the oldest backup is replaced. Pass
     * `protectedSlot` to keep a specific backup safe (used when the safety
     * snapshot for a restore must not evict the backup being restored).
     */
    public create(reason: BackupReason = "manual", name?: string, protectedSlot?: number): BackupResult {
        const slot = this.allocateSlot(protectedSlot);
        if (slot === undefined) return { ok: false, error: BackupError.NoSpace };

        const snapshot: GenericSchema = {};
        for (const [tableName, table] of Object.entries(this.tables)) {
            snapshot[tableName] = table.getTable();
        }

        let serialized: string;
        try {
            serialized = JSON.stringify(snapshot);
        } catch (e) {
            console.error(`[BACKUPS]: Could not serialize the database snapshot: ${e}`);
            return { ok: false, error: BackupError.WriteFailed };
        }

        const chunks = splitIntoChunks(serialized);
        const meta: BackupMeta = {
            version: 1,
            name: sanitizeName(name, reason),
            createdAt: this.now(),
            reason,
            chunks: chunks.length,
            checksum: calculateChecksum(serialized),
            bytes: serialized.length,
            tables: Object.keys(snapshot)
        };

        // A corrupt or orphaned backup in this slot must not survive as stale chunks.
        this.clearSlot(slot);

        try {
            for (let i = 0; i < chunks.length; i++) {
                world.setDynamicProperty(this.chunkKey(slot, i), chunks[i]);
            }
            // The metadata write is the commit point: without it the chunks are ignored.
            world.setDynamicProperty(this.metaKey(slot), JSON.stringify(meta));
        } catch (e) {
            console.error(`[BACKUPS]: Could not write backup to slot ${slot}: ${e}`);
            this.clearSlot(slot);
            return { ok: false, error: BackupError.WriteFailed };
        }

        this.lastAutoRevision = getDatabaseRevision();
        this.lastAutoBackupAt = meta.createdAt;
        return { ok: true, backup: { ...meta, slot } };
    }

    /**
     * Restores a backup.
     *
     * The current database is snapshotted first (as a `safety` backup) so a
     * restore can always be undone while it is still among the stored backups.
     */
    public restore(slot: number): BackupResult {
        const snapshot = this.readSnapshot(slot);
        if (!snapshot) return { ok: false, error: BackupError.Corrupted };

        const safety = this.create("safety", undefined, slot);
        if (!safety.ok) return { ok: false, error: safety.error };

        let restoredTables = 0;
        for (const [tableName, data] of Object.entries(snapshot.data)) {
            const table = this.tables[tableName];
            if (!table || typeof data !== "object" || data === null || Array.isArray(data)) continue;

            if (!table.replaceMemory(data)) {
                return { ok: false, error: BackupError.WriteFailed };
            }
            restoredTables++;
        }

        if (restoredTables === 0) return { ok: false, error: BackupError.Corrupted };

        this.lastAutoRevision = getDatabaseRevision();
        return { ok: true, backup: { ...snapshot.meta, slot }, safetyBackup: safety.backup };
    }

    /** Permanently deletes a backup. */
    public delete(slot: number): boolean {
        if (!this.isValidSlot(slot) || !this.readMeta(slot)) return false;
        this.clearSlot(slot);
        return true;
    }

    /**
     * Starts the automatic backup timer. Safe to call more than once.
     * An initial snapshot is created when no backups exist yet.
     */
    public startAutoBackup(): void {
        if (this.autoBackupTimer !== undefined) return;

        this.lastAutoRevision = getDatabaseRevision();
        const newest = this.list()[0];
        this.lastAutoBackupAt = newest?.createdAt ?? this.now();

        if (!newest) this.create("auto", "Initial backup");

        // Waking up once a minute lets the interval setting change without rescheduling.
        this.autoBackupTimer = system.runInterval(() => this.autoBackupTick(), AUTO_BACKUP_CHECK_TICKS);
    }

    private autoBackupTick(): void {
        if (!DB.Config.get("autoBackup")) return;
        if (this.now() - this.lastAutoBackupAt < getAutoBackupIntervalMinutes() * 60_000) return;
        if (getDatabaseRevision() === this.lastAutoRevision) return;

        this.create("auto");
    }

    private isValidSlot(slot: number): boolean {
        return Number.isInteger(slot) && slot >= 0 && slot < this.maxBackups;
    }

    private allocateSlot(protectedSlot?: number): number | undefined {
        let oldest: Backup | undefined;

        for (let slot = 0; slot < this.maxBackups; slot++) {
            const meta = this.readMeta(slot);
            if (!meta) return slot;
            if (slot === protectedSlot) continue;

            if (!oldest || meta.createdAt < oldest.createdAt) {
                oldest = { ...meta, slot };
            }
        }

        return oldest?.slot;
    }

    private readMeta(slot: number): BackupMeta | undefined {
        if (!this.isValidSlot(slot)) return undefined;

        const raw = world.getDynamicProperty(this.metaKey(slot));
        if (typeof raw !== "string") return undefined;

        try {
            return parseMeta(JSON.parse(raw));
        } catch {
            return undefined;
        }
    }

    private readSnapshot(slot: number): { meta: BackupMeta; data: GenericSchema } | undefined {
        const meta = this.readMeta(slot);
        if (!meta) return undefined;

        let serialized = "";
        for (let i = 0; i < meta.chunks; i++) {
            const chunk = world.getDynamicProperty(this.chunkKey(slot, i));
            if (typeof chunk !== "string") return undefined;
            serialized += chunk;
        }

        if (calculateChecksum(serialized) !== meta.checksum) return undefined;

        try {
            const data = JSON.parse(serialized) as unknown;
            if (typeof data !== "object" || data === null || Array.isArray(data)) return undefined;
            return { meta, data: data as GenericSchema };
        } catch {
            return undefined;
        }
    }

    private clearSlot(slot: number): void {
        const prefix = slotPrefix(slot);
        for (const id of world.getDynamicPropertyIds()) {
            if (!id.startsWith(prefix)) continue;
            try {
                world.setDynamicProperty(id, undefined);
            } catch {
                // Non-critical cleanup; the slot is overwritten on the next write anyway.
            }
        }
    }

    private metaKey(slot: number): string {
        return `${slotPrefix(slot)}${META_SUFFIX}`;
    }

    private chunkKey(slot: number, index: number): string {
        return `${slotPrefix(slot)}${index}`;
    }
}

/** Shared instance used by the add-on. */
export const backups = new BackupManager();

function slotPrefix(slot: number): string {
    return `${SLOT_PREFIX}${slot}_`;
}

function splitIntoChunks(serialized: string): string[] {
    return serialized.match(new RegExp(`.{1,${Database.CHUNK_SIZE}}`, "g")) ?? [serialized];
}

function sanitizeName(name: string | undefined, reason: BackupReason): string {
    const cleaned = (name ?? "").replace(/§./g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
    return cleaned || REASONS[reason].defaultName;
}

function parseMeta(value: unknown): BackupMeta | undefined {
    if (typeof value !== "object" || value === null) return undefined;

    const meta = value as Partial<BackupMeta>;
    const valid =
        meta.version === 1 &&
        typeof meta.name === "string" &&
        typeof meta.createdAt === "number" &&
        (meta.reason === "manual" || meta.reason === "auto" || meta.reason === "safety") &&
        Number.isInteger(meta.chunks) &&
        (meta.chunks ?? 0) > 0 &&
        typeof meta.checksum === "number" &&
        typeof meta.bytes === "number" &&
        Array.isArray(meta.tables);

    return valid ? meta as BackupMeta : undefined;
}
