import { ActionButton, ActionForm } from "../builder";
import { UiLoader } from "../uiLoader";
import { UiIndex } from "../index";
import {
    banUnbanMenu, freecamMenu,
    freezeUnfreeze,
    jailMenu,
    killAPlayer, launchPlayer,
    projectilePowers,
    seeInventoryMenu,
    vanishMenu
} from "../../main";

const auMain: ActionForm = {
    type: "action",
    title: "§l§b§kkdk§r§l§cAdmin §autils§b§kkdk",
    elements: [
        {
            type: "button",
            text: "%au.banButton",
            icon: "textures/icons/ban.png",
            permission: "ui.au.ban",
            action: context => {
                banUnbanMenu(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.jailButton",
            permission: "ui.au.jail",
            icon: "textures/icons/jail.png",
            action: context => {
                jailMenu(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.vanishButton",
            permission: "ui.au.vanish",
            icon: "textures/icons/vanish.png",
            action: context => {
                vanishMenu(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.freezeButton",
            permission: "ui.au.freeze",
            icon: "textures/icons/freeze.png",
            action: context => {
                freezeUnfreeze(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.seeInvButton",
            permission: "ui.au.seeInv",
            icon: "textures/icons/chest.png",
            action: context => {
                seeInventoryMenu(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.freecamButton",
            permission: "ui.au.freecam",
            icon: "textures/icons/camera.png",
            action: context => {
                freecamMenu(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.projectilePowersButton",
            permission: "ui.au.projectilePowers",
            icon: "textures/icons/projPowers.png",
            action: context => {
                projectilePowers(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.killButton",
            permission: "ui.au.kill",
            icon: "textures/icons/sword.png",
            action: context => {
                killAPlayer(context.player);
            }
        } as ActionButton,
        {
            type: "button",
            text: "%au.launchButton",
            permission: "ui.au.launch",
            icon: "textures/icons/launch.png",
            action: context => {
                launchPlayer(context.player);
            }
        } as ActionButton,
    ],
    back: "mainMenu"
};



class AuLoader extends UiLoader {
    uiIndex: UiIndex = {
        auMain
    }
}

export const auLoader = new AuLoader();