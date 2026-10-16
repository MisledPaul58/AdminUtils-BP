/**
 * Minimal in-memory stand-in for `@minecraft/server`.
 *
 * Only the pieces exercised by unit tests are implemented. Dynamic properties are
 * backed by a Map so persistence logic (chunking, checksums, backups) can be tested
 * without a running Minecraft client.
 */

export type DynamicPropertyValue = boolean | number | string | { x: number; y: number; z: number };

const dynamicProperties = new Map<string, DynamicPropertyValue>();

/** Test-only helper: clears the in-memory dynamic property store. */
export function __resetDynamicProperties(): void {
    dynamicProperties.clear();
}

export const world = {
    getDynamicProperty(identifier: string): DynamicPropertyValue | undefined {
        return dynamicProperties.get(identifier);
    },
    setDynamicProperty(identifier: string, value?: DynamicPropertyValue): void {
        if (value === undefined) {
            dynamicProperties.delete(identifier);
        } else {
            dynamicProperties.set(identifier, value);
        }
    },
    getDynamicPropertyIds(): string[] {
        return [...dynamicProperties.keys()];
    },
    getDynamicPropertyTotalByteCount(): number {
        return 0;
    },
    sendMessage(): void {},
    getPlayers(): unknown[] {
        return [];
    },
    getAllPlayers(): unknown[] {
        return [];
    },
    getDimension(): unknown {
        return undefined;
    },
    scoreboard: {
        getObjective: () => undefined,
        addObjective: () => undefined
    },
    beforeEvents: {},
    afterEvents: {}
};

export const system = {
    run(callback: () => void): number {
        callback();
        return 0;
    },
    runInterval(): number {
        return 0;
    },
    runTimeout(): number {
        return 0;
    },
    clearRun(): void {},
    runJob(): void {}
};

export const GameMode = {
    Survival: "survival",
    Creative: "creative",
    Adventure: "adventure",
    Spectator: "spectator"
} as const;

export const CommandPermissionLevel = {
    Any: 0,
    GameDirectors: 1,
    Admin: 2,
    Host: 3,
    Owner: 4
} as const;

export const PlayerPermissionLevel = {
    Visitor: 0,
    Member: 1,
    Operator: 2
} as const;

export const TicksPerSecond = 20;

export const EffectTypes = {
    get: (): undefined => undefined
};
