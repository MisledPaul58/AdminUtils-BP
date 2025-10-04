import { ServerBootstrap } from "../server";
import { Form } from "./builder";
import { mainMenuLoader } from "./mainMenu";
import { adminSettingsLoader } from "./adminSettings";
import { pluginsLoader } from "./plugins/plugins";

export type UiIndex = { [key: string]: Form };

export function* loadUIs(bootstrap: ServerBootstrap) {
    // Main menu
    yield* mainMenuLoader.loadUis(bootstrap);

    // Admin settings
    yield* adminSettingsLoader.loadUis(bootstrap);

    // Plugins
    yield* pluginsLoader.loadUis(bootstrap);
}