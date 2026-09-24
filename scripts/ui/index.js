import { mainMenuLoader } from "./mainMenu";
import { settingsLoader } from "./settings";
import { auLoader } from "./au/auMain";
import { pluginsLoader } from "./plugins/plugins";
export function* loadUIs(bootstrap) {
    // Main menu
    yield* mainMenuLoader.loadUis(bootstrap);
    // Settings
    yield* settingsLoader.loadUis(bootstrap);
    // Admin utils
    yield* auLoader.loadUis(bootstrap);
    // Plugins
    yield* pluginsLoader.loadUis(bootstrap);
}
