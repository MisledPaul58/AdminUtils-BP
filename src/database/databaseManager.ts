import { Database } from "./database";
import { GroupSerializedData, UserSerializedData } from "../permissions/model/permissionHolder";
import { GameMode, Vector3, world } from "@minecraft/server";

export type GenericSchema = Record<string, any>;

export interface LoadDataSchema {
    loadedAtLeastOnce: boolean;
}

export interface ServerSchema {
    admins: string[];
}

export interface ConfigSchema {
    startupMsg: boolean;
    ownerTag: string;
    adminTag: string;
}

interface PlayerData {
    lastDimension: string;
    lastLoc: Vector3;
    lastGameMode: GameMode;
}
export interface PlayerDataSchema {
    [playerName: string]: Partial<PlayerData>
}

// export interface FreecamSchema {
//     config: {
//         autoChunkLoad: {
//             forceLoad: boolean;
//         }
//     };
//     players: Record<string, {
//         hasToLeaveFreeCam: boolean;
//     }>
// }

export interface PermissionsSchema {
    "-auEnabled": boolean;
    "users": Record<string, UserSerializedData>;
    "groups": Record<string, GroupSerializedData>;
}

class DatabaseManager {
    public loaded: boolean = false;

    public readonly tables = {
        LoadData: new Database<LoadDataSchema>("LoadData"),
        Server: new Database<ServerSchema>("Server"),
        Config: new Database<ConfigSchema>("Config"),
        PlayerData: new Database<PlayerDataSchema>("PlayerData"),
        Freecam: new Database<GenericSchema>("Freecam"),
        Permissions: new Database<PermissionsSchema>("Permissions")
    };

    public *loadAll() {
        yield* this.tables.LoadData.fetch();
        yield* this.tables.Server.fetch();
        yield* this.tables.Config.fetch();
        yield* this.tables.PlayerData.fetch();
        yield* this.tables.Freecam.fetch();
        yield* this.tables.Permissions.fetch();

        this.loaded = true;
        console.warn("[DATABASE] All databases have been loaded successfully.");
    }
}

export const DBManager = new DatabaseManager();

export const DB = DBManager.tables;