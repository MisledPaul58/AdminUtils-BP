import { playerPermissions } from "./playerPermissions";
import { ranks } from "../plugins/index";

export class Permissions {
    /**
     * Check if a player has a certain permission. Set locally to true to only check the permission in the player without ranks.
     * @param { Player || String } player
     * @param { String } permission
     * @param { Boolean } locally
     */
    static has(player, permission, locally = false) {
        if (locally || !ranks.enabled) {
            return playerPermissions.has(player, permission);
        } else {

        }
    }

    static set() {

    }
}