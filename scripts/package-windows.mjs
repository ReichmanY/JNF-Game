import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "release", "GreenHorizons");
const csc =
  process.env.WINDIR &&
  join(process.env.WINDIR, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    throw new Error(`${command} failed`);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

console.log("Building the web app...");
run("npm", ["run", "build"]);

console.log("Bundling the server...");
await build({
  entryPoints: [join(root, "server", "index.js")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(out, "server.mjs"),
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

console.log("Copying game files...");
cpSync(join(root, "dist"), join(out, "dist"), { recursive: true });
cpSync(join(root, "public"), join(out, "public"), { recursive: true });
mkdirSync(join(out, "data"), { recursive: true });
mkdirSync(join(out, "public", "uploads"), { recursive: true });

const nodeSrc = process.execPath;
mkdirSync(join(out, "runtime"), { recursive: true });
cpSync(nodeSrc, join(out, "runtime", "node.exe"));

if (!csc || !existsSync(csc)) {
  throw new Error("Windows C# compiler (csc.exe) was not found.");
}

console.log("Creating GreenHorizons.exe...");
run(csc, [
  "/nologo",
  "/optimize",
  "/target:exe",
  `/out:${join(out, "GreenHorizons.exe")}`,
  join(root, "scripts", "launcher.cs"),
]);

writeFileSync(
  join(out, "HOW-TO-RUN.txt"),
  `Green Horizons — Guess the Place
Windows standalone package

START
  Double-click GreenHorizons.exe
  Two browser tabs open:
    Game  http://127.0.0.1:3000/
    Admin http://127.0.0.1:3000/admin.html
  Admin PIN (default): horizons

STOP
  Click the black Green Horizons window and press Ctrl+C
  or close that window.

KEEP TOGETHER
  Do not separate GreenHorizons.exe from the folders next to it
  (runtime, public, dist, data, server.mjs).

You can copy this whole GreenHorizons folder to another Windows PC.
No install is required.
`
);

console.log(`\nPackage ready: ${out}`);
console.log("Double-click GreenHorizons.exe to start.");
