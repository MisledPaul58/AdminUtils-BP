import { mainMenuLoader } from "./mainMenu";
import { adminSettingsLoader } from "./adminSettings";
import { pluginsLoader } from "./plugins/plugins";
export function* loadUIs(bootstrap) {
    // Main menu
    yield* mainMenuLoader.loadUis(bootstrap);
    // Admin settings
    yield* adminSettingsLoader.loadUis(bootstrap);
    // Plugins
    yield* pluginsLoader.loadUis(bootstrap);
}
