import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const manifestUrl = new URL("manifest.json", root);
const raw = await readFile(manifestUrl, "utf8");
const manifest = JSON.parse(raw);

const version = pkg.version.split(".").map((part) => Number.parseInt(part, 10));
if (version.length !== 3 || version.some((part) => Number.isNaN(part))) {
    throw new Error(`[version] package.json "version" must be semver (major.minor.patch), got "${pkg.version}"`);
}

manifest.header.version = version;

// The BP and RP ship together as one add-on and share a version, so any
// dependency referenced by UUID (our sibling pack) is kept in lockstep.
// External module dependencies (referenced by module_name) are left alone.
let synced = 0;
for (const dependency of manifest.dependencies ?? []) {
    if (typeof dependency.uuid === "string") {
        dependency.version = version;
        synced++;
    }
}

// Re-serialise while preserving the file's existing line endings and indentation
// so a version sync produces no unrelated diff.
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const indentation = raw.match(/\r?\n([\t ]+)"/)?.[1] ?? "\t";
const hadTrailingNewline = /[\r\n]$/.test(raw);

let output = JSON.stringify(manifest, null, indentation).replace(/\n/g, eol);
if (hadTrailingNewline && !output.endsWith(eol)) {
    output += eol;
}

await writeFile(manifestUrl, output);

console.log(`[version] manifest.json header.version -> ${version.join(".")} (${synced} dependency version(s) synced)`);
