import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

for (const target of ["scripts", "dist"]) {
    const url = new URL(target, root);
    await rm(url, { recursive: true, force: true });
    console.log(`[clean] removed ${fileURLToPath(url)}`);
}
