import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "release", "GreenHorizons-site");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const basePath = "/game";

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed`);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

console.log(`Building the web app for ${basePath}/ ...`);
run("npm", ["run", "build"], { VITE_BASE: `${basePath}/` });

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
writeFileSync(
  join(out, "data", "store.json"),
  `${JSON.stringify({ players: [], lastResetAt: null }, null, 2)}\n`
);

writeFileSync(join(out, "VERSION.txt"), `${version}\n`);
writeFileSync(join(out, "BASE_PATH.txt"), `${basePath}\n`);

writeFileSync(
  join(out, "start.sh"),
  `#!/bin/sh
cd "$(dirname "$0")"
export BASE_PATH="\${BASE_PATH:-/game}"
export PORT="\${PORT:-3000}"
exec node server.mjs
`
);
try {
  chmodSync(join(out, "start.sh"), 0o755);
} catch {
  /* Windows may ignore chmod */
}

writeFileSync(
  join(out, "start.cmd"),
  `@echo off
cd /d "%~dp0"
set BASE_PATH=/game
set PORT=3000
node server.mjs
`
);

writeFileSync(
  join(out, "wordpress-iframe.html"),
  `<!-- Paste into a WordPress Custom HTML block. Replace YOUR-SITE with the real domain. -->
<iframe
  src="https://YOUR-SITE/game/"
  title="Green Horizons Guess the Place"
  style="width:100%;min-height:100vh;height:100vh;border:0;display:block"
  allow="fullscreen"
  loading="lazy"
></iframe>
`
);

writeFileSync(
  join(out, "SITE-INSTALL.txt"),
  `Green Horizons - Guess the Place
Version ${version}
WordPress / website package

This package is built for this public URL:

  https://YOUR-SITE/game/
  https://YOUR-SITE/game/admin.html

Scores are saved on the website server in this folder:

  data/store.json

They are NOT stored in WordPress MySQL. The Node process on the home site
writes the file. Keep data/ writable. Back it up with the rest of the site.

----------------------------------------------------------------
1. REQUIREMENTS
----------------------------------------------------------------
- Node.js 18 or newer on the same server as the WordPress site
  (or a reverse-proxy to a small Node process on that host)
- A reverse proxy path /game/ -> the Node process (port 3000 by default)
- Writable folders: data/   public/   public/uploads/

WordPress PHP alone cannot run this game. The home page is only an iframe.

----------------------------------------------------------------
2. INSTALL THE GAME FILES
----------------------------------------------------------------
Unzip this folder on the server, for example:

  /var/www/green-horizons/

Do not mix these files into wp-content. Keep them as their own app.

Start:

  cd /var/www/green-horizons
  chmod +x start.sh
  BASE_PATH=/game PORT=3000 ./start.sh

Or:

  BASE_PATH=/game PORT=3000 node server.mjs

Keep it running with systemd, pm2, or the host panel "Node.js app".
See green-horizons.service in this folder.

----------------------------------------------------------------
3. REVERSE PROXY (nginx example)
----------------------------------------------------------------
location /game/ {
  proxy_pass http://127.0.0.1:3000/game/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-Prefix /game;
}

Apache equivalent: ProxyPass /game/ http://127.0.0.1:3000/game/

After proxy, test:

  https://YOUR-SITE/game/
  https://YOUR-SITE/game/api/health

Health should return JSON with "ok": true.

----------------------------------------------------------------
4. WORDPRESS PAGE
----------------------------------------------------------------
Create a WordPress page (slug can be anything except one that fights /game/,
for example "guess-the-place").

Add a Custom HTML block and paste wordpress-iframe.html
(replace YOUR-SITE with sayarut.org.il or the real domain):

<iframe
  src="https://YOUR-SITE/game/"
  title="Green Horizons Guess the Place"
  style="width:100%;min-height:100vh;height:100vh;border:0;display:block"
  allow="fullscreen"
  loading="lazy"
></iframe>

Visitors stay on the WordPress site. The game and the score API run at /game/.

----------------------------------------------------------------
5. ADMIN AND SCORES
----------------------------------------------------------------
Staff console:  https://YOUR-SITE/game/admin.html
Default PIN:    horizons   (change it in Settings after first login)

Registered scores, names, and contacts:  data/store.json
Questions and photos:                    public/questions.json
                                         public/pictures/
                                         public/uploads/
Settings:                                public/config.json

Clear users and auto-reset are in the staff console.

----------------------------------------------------------------
6. GITHUB
----------------------------------------------------------------
Source repository:

  https://github.com/ReichmanY/JNF-Game

This zip is the ready-to-run build with the current questions, photos, and
settings. GitHub is the source; use it if you prefer to build on the server.

From GitHub:

  git clone https://github.com/ReichmanY/JNF-Game.git
  cd JNF-Game
  npm install
  VITE_BASE=/game/ npm run build
  BASE_PATH=/game PORT=3000 npm start

Use the same nginx /game/ proxy. Scores still go to data/store.json
on that server (the Node process, not WordPress MySQL).

Run a single Node process. In-progress games live in memory; finished
scores are written to data/store.json.

----------------------------------------------------------------
7. SUBDOMAIN INSTEAD OF /game/
----------------------------------------------------------------
This zip is compiled for the /game/ path. For a subdomain such as
https://game.YOUR-SITE/ ask the developer for a root-path rebuild, or from
GitHub build with VITE_BASE=/ and BASE_PATH empty.

----------------------------------------------------------------
STOP
  Stop the Node process (systemctl stop, pm2 stop, or Ctrl+C).
`
);

writeFileSync(
  join(out, "nginx-game.conf"),
  `location /game/ {
  proxy_pass http://127.0.0.1:3000/game/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-Prefix /game;
}
`
);

writeFileSync(
  join(out, "green-horizons.service"),
  `[Unit]
Description=Green Horizons Guess the Place
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/green-horizons
Environment=BASE_PATH=/game
Environment=PORT=3000
ExecStart=/usr/bin/node server.mjs
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
`
);

const zip = join(root, "release", `GreenHorizons-v${version}-wordpress.zip`);
rmSync(zip, { force: true });
console.log("Creating zip...");
const zipResult = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${out}' -DestinationPath '${zip}' -CompressionLevel Optimal`,
  ],
  { stdio: "inherit" }
);
if (zipResult.status !== 0) {
  throw new Error("zip failed");
}

console.log(`\nSite package ready: ${out}`);
console.log(`Zip: ${zip}`);
console.log("Public URL path: /game/");
