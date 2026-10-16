import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tsc = require.resolve("typescript/bin/tsc");

const result = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], { stdio: "inherit" });

// tsc exit codes: 0 = success, 2 = type errors were reported. With `noEmitOnError: false`
// the JavaScript is still emitted for code 2, so we tolerate it while the legacy type debt
// in src/main.ts and src/systems/freeCam.ts exists. Everything else is a hard failure.
const status = result.status ?? 1;

if (status === 2) {
    console.warn("\n[build] tsc reported type errors but emitted output anyway. Run `npm run typecheck` for details.");
    process.exit(0);
}

process.exit(status);
