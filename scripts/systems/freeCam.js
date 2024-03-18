import { Player, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { adminUtils } from "../main";

class FreeCam {
    /**
     * @param { Player } player 
     */
    init(player) {
        world.sendMessage(`${world.getDynamicPropertyIds()}`);
        const form = new ActionFormData()
            .title("Freecam menu")
            .body("Select a freecam mode")
            .button("§l<-- Back", "textures/icons/back.png")
            .button("Spectator freecam")
            .button("Freecam [Experimental]");
        form.show(player).then((response) => {
            if (response.canceled === true) return;
            const { selection } = response;

            switch (selection) {
                case 0: //Back
                    adminUtils(player);
                    break;
                case 1: { //Spectator freecam
                    const form = new ActionFormData()
                        .title("Spectator freecam")
                        .body("Select an option")
                        .button("§l<-- Back", "textures/icons/back.png")
                        .button("Type an online player instead", "textures/icons/pencil.png")
                        .button("Enable for myself");
                    
                    // for (const player of )
                    form.show(player).then((response) => {
                        if (response.canceled === true) return;
                        const { selection } = response;

                        if (selection === 0) {
                            this.init(player);

                        } else if (selection === 1) {


                        } else if (selection === 2) {
                         
                            
                        } else if (selection >= 3) {


                        }
                    });
                } break;
                case 2: { //Freecam [Experimental]

                } break;
                default:
                    break;
            }
        });
    }

    isInFreecam() {
        
    }
}

export const freeCam = new FreeCam();