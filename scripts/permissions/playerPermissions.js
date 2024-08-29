import { Player } from "@minecraft/server";
import { defaultPermissions } from "./defaultPermissions";

class PlayerPermissions {
    /**
     * @type Map
     */
    #permissions;

    constructor() {
        this.#permissions = new Map();
        this.fetch();
    }

    fetch() {
        //this._fetch(...);
    }

    #resolvePlayer(player) {
        return player instanceof Player ? player.name : player;
    }

    /**
     * @param { Player || String } player
     * @param { String } permission
     * @return { Boolean }
     */
    has(player, permission) {
        // const value = this.#permissions.get(this.#resolvePlayer(player))?.[permission];
        //
        // if (value === undefined && defaultPermissions.includes(permission)) {
        //     return true;
        // } else {
        //     return Boolean(value);
        // }
    }

    /**
     * @param { Player || String } player
     * @param { String } permission
     * @param { Boolean } value
     */
    set(player, permission, value) {
        const _player = this.#resolvePlayer(player);

        const permissions = this.#permissions.get(_player);
        permissions[permission] = value;
    }

    /**
     * @param { Player || String } player
     * @param { String } permission
     */
    reset(player, permission) {
        const permissions = this.#permissions.get(this.#resolvePlayer(player));

        delete permissions[permission];
    }
}

export const playerPermissions = new PlayerPermissions();