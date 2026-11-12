/**
 * Deterministic PWA icon generation from public/icon.svg using sharp / librsvg.
 * This build-time tool adds no application dependency.
 *
 * With sharp available to Node:
 *   node scripts/generate-icons.mjs
 * With the Codex bundled libraries (or another external node_modules directory):
 *   node scripts/generate-icons.mjs --modules "C:/path/to/node_modules"
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const modulesIndex = process.argv.indexOf("--modules");
const externalModules =
  modulesIndex >= 0 ? process.argv[modulesIndex + 1] : null;
const require = createRequire(
  externalModules
    ? path.resolve(externalModules, "__icon_generator__.cjs")
    : import.meta.url,
);
let sharp;
try {
  sharp = require("sharp");
} catch {
  throw new Error(
    'Icon generation needs the build-time sharp library. Pass --modules "path/to/node_modules" to use an existing installation.',
  );
}

const source = await readFile(path.join(root, "public/icon.svg"), "utf8");
const opaqueSource = source.replace(
  /<rect id="icon-background"[^>]*\/>/,
  (background) => background.replace('rx="112"', 'rx="0"'),
);
// The 296px board is inset to 266.4px. Even its square corners lie inside
// the central 80%-diameter safe-zone circle (radius 204.8px at 512px).
const maskableSource = opaqueSource.replace(
  '<g id="board-mark"',
  '<g id="board-mark" transform="translate(256 256) scale(.9) translate(-256 -256)"',
);

const icons = [
  ["icon-192.png", 192, source],
  ["icon-512.png", 512, source],
  ["icon-maskable-512.png", 512, maskableSource],
  ["apple-touch-icon.png", 180, opaqueSource],
  ["favicon-32.png", 32, source],
];
for (const [name, size, svg] of icons) {
  const output = await sharp(Buffer.from(svg), { density: 144 })
    .resize(size, size, { kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(root, "public", name), output);
  console.log(`${name}: ${size} × ${size}`);
}
