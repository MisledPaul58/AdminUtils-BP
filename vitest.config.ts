import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.test.ts"]
    },
    resolve: {
        alias: {
            // The real @minecraft/* packages ship types only (no runtime), so tests
            // run against lightweight in-memory stand-ins.
            "@minecraft/server": fileURLToPath(new URL("./test/mocks/server.ts", import.meta.url)),
            "@minecraft/server-ui": fileURLToPath(new URL("./test/mocks/server-ui.ts", import.meta.url))
        }
    }
});
