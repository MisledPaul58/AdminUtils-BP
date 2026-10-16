import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);

const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));

// The "[26.50]" part of the distribution filename is the targeted Minecraft
// version, derived from the manifest's min_engine_version (e.g. [1, 26, 50] -> "26.50").
const [, mcMajor, mcMinor] = manifest.header.min_engine_version;
const mcVersion = `${mcMajor}.${mcMinor}`;

// Everything that is NOT part of the shipped pack.
const IGNORED = [
    "src/**",
    "test/**",
    "tools/**",
    "dist/**",
    "node_modules/**",
    ".git/**",
    ".github/**",
    ".idea/**",
    ".vscode/**",
    "**/*.md",
    "**/*.map", // source maps are for local debugging, not for the shipped pack
    "*.json", // root-only: package.json, package-lock.json, tsconfig*.json (manifest.json re-added below). Nested pack JSON (items/, functions/, ...) is kept.
    "eslint.config.*",
    "vitest.config.*",
    ".editorconfig",
    ".gitignore",
    ".gitattributes"
];

const outDir = new URL("dist/", root);
await mkdir(outDir, { recursive: true });
const outFile = fileURLToPath(new URL(`AdminUtils BP [${mcVersion}] v${pkg.version}.mcpack`, outDir));

// Fail loudly if the pack was never built.
try {
    await stat(new URL("scripts/main.js", root));
} catch {
    console.error("[pack] scripts/main.js not found - run `npm run build` first.");
    process.exit(1);
}

const output = createWriteStream(outFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.on("warning", (err) => {
    if (err.code !== "ENOENT") throw err;
    console.warn(`[pack] ${err.message}`);
});
archive.on("error", (err) => {
    throw err;
});

const done = new Promise((resolve, reject) => {
    output.on("close", () => resolve(archive.pointer()));
    output.on("error", reject);
});

archive.pipe(output);
// Pack contents: everything not ignored...
archive.glob("**/*", { cwd: rootPath, dot: true, ignore: IGNORED });
// ...plus the manifest, which is excluded by the "*.json" ignore above.
archive.file(fileURLToPath(new URL("manifest.json", root)), { name: "manifest.json" });

await archive.finalize();
const size = await done;

console.log(`[pack] wrote ${outFile} (${(size / 1024).toFixed(1)} KiB)`);
