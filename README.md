# Green Horizons — Guess the Place

A web map-guessing game for the JNF-USA / Green Horizons (Chugei Siyarot) annual conference. Players read a clue, tap the map of Israel, and score points for accuracy and speed.

Current release: **v1.0.1** (set in `package.json` and `shared/version.js`).

The interface is English-only and works on desktop, tablet, and phone — including a conference booth kiosk.

## How to run

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

- Game: `/`
- Staff console: `/admin.html` (default PIN `horizons`) — add or edit places and photos, change timers/scoring/copy, and export the leaderboard

For a single production process that serves the built game and the API:

```bash
npm run build
npm start
```

On a conference LAN, start that server on a laptop and open `http://<laptop-ip>:3000` on each booth tablet so everyone shares one leaderboard.

## Windows standalone package (no npm needed)

On a development PC:

```bash
npm run package:win
```

This creates `release/GreenHorizons/`. Copy that whole folder to a USB drive or another Windows computer, then double-click `GreenHorizons.exe`. It starts a local server and opens the game and admin in the browser. Close the black window (or press Ctrl+C) to stop.

## Enter questions, photos, and settings

Open **Staff console** at `/admin.html` (with the API running) and use the three tabs:

1. **Questions** — Add Place. Enter the English name and hint, choose difficulty, click the map for the correct point, then paste a photo URL or upload a JPG/PNG/WebP/GIF (stored in `public/uploads/`).
2. **Settings** — Change questions-per-round, timers, scoring, on-screen copy, map zoom, and the admin PIN.
3. **Players** — View registered contacts and export CSV for prize winners.

Saves write to `public/questions.json` and `public/config.json`, so you can also edit those files directly if you prefer.

Keep enough places in each difficulty (about 3–4× the per-game count) so repeat plays stay varied.

## Leaderboard and privacy

Registered players enter a name plus email or phone, and must tick a consent box. Guests play with a display name only and can join the board after the round.

The public leaderboard shows **name and score only**. Contact details appear only in `/admin.html` and the CSV export, so staff can reach the top three after the conference end date.

If the API is running, scores are stored in `data/store.json` and checked on the server (the client score is not trusted). If the API is offline, the game still works and keeps a local leaderboard in the browser.

## Embed

```html
<iframe
  src="https://your-host.example/"
  title="Green Horizons Guess the Place"
  style="width:100%;height:100vh;border:0"
  allow="fullscreen"
></iframe>
```

## Scope notes

Visual branding can be swapped later via CSS and `public/logo.svg`. The official question photos and final copy should replace the sample content in `questions.json` and `config.json`.
