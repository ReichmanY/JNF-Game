import "./styles.css";
import { withBase } from "./base.js";
import { createIsraelMap } from "./map.js";
import { brandBar } from "./brand.js";
import { APP_VERSION_LABEL } from "../shared/version.js";
import { FAMILIES, familyLabel, splitFamilyCounts, DEFAULT_FAMILY_MIX } from "../shared/families.js";

const root = document.getElementById("app");
const pinKey = "gh-admin-pin";

const state = {
  pin: "",
  remote: false,
  tab: "questions",
  filter: "all",
  config: null,
  questions: [],
  players: { players: [], stats: { players: 0, plays: 0, topScore: 0 } },
  editing: null,
  message: "",
  error: "",
  picker: null,
};

async function boot() {
  const fallback = await (await fetch(withBase("/config.json"))).json();
  state.config = fallback;
  const saved = sessionStorage.getItem(pinKey);
  if (saved) {
    await openConsole(saved);
    return;
  }
  renderLogin();
}

function renderLogin() {
  root.innerHTML = `
    <section class="screen sheet">
      ${brandBar()}
      <div class="sheet-inner">
        <div class="eyebrow">${escapeHtml(state.config.brand.programName)}</div>
        <h1>Staff console</h1>
        <p class="muted">Enter questions and photos, change game settings, and export prize-winner contacts.</p>
        <p class="version-tag version-tag-dark">${APP_VERSION_LABEL}</p>
        <form id="pin-form">
          <div class="field">
            <label for="pin">Admin PIN</label>
            <div class="password-wrap">
              <input id="pin" name="pin" type="password" autocomplete="current-password" />
              <button class="password-toggle" type="button" id="toggle-pin" aria-label="Show PIN" aria-pressed="false" title="Show PIN">
                ${eyeIcon()}
              </button>
            </div>
          </div>
          ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
          <button class="btn btn-primary btn-wide" type="submit">Open console</button>
        </form>
      </div>
    </section>
  `;
  root.querySelector("#pin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await openConsole(String(new FormData(event.target).get("pin") || ""));
  });
  root.querySelector("#toggle-pin")?.addEventListener("click", () => {
    const input = root.querySelector("#pin");
    const btn = root.querySelector("#toggle-pin");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.innerHTML = show ? eyeOffIcon() : eyeIcon();
    btn.setAttribute("aria-pressed", String(show));
    btn.setAttribute("aria-label", show ? "Hide PIN" : "Show PIN");
    btn.title = show ? "Hide PIN" : "Show PIN";
    input.focus();
  });
}

function eyeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function eyeOffIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.3 21.3 0 0 1 5.06-6.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.16 21.16 0 0 1-4.23 5.59"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

async function openConsole(pin) {
  try {
    state.remote = await fetch(withBase("/api/health")).then((r) => r.ok).catch(() => false);
    if (!state.remote) throw new Error("Start the game server (npm run dev) to edit questions and settings.");
    const [contentRes, playersRes] = await Promise.all([
      fetch(withBase(`/api/admin/content?pin=${encodeURIComponent(pin)}`)),
      fetch(withBase(`/api/admin/players?pin=${encodeURIComponent(pin)}`)),
    ]);
    if (!contentRes.ok || !playersRes.ok) throw new Error("That PIN was not accepted.");
    const content = await contentRes.json();
    state.pin = pin;
    state.config = content.config;
    state.questions = content.questions;
    state.players = await playersRes.json();
    state.error = "";
    sessionStorage.setItem(pinKey, pin);
    render();
  } catch (error) {
    state.error = error.message;
    renderLogin();
  }
}

function headers() {
  return { "Content-Type": "application/json", "x-admin-pin": state.pin };
}

async function api(path, options = {}) {
  const res = await fetch(withBase(path), { ...options, headers: { ...headers(), ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function render() {
  destroyPicker();
  const counts = { settlements: 0, "jnf-sites": 0, "general-sites": 0, easy: 0, medium: 0, hard: 0 };
  for (const q of state.questions) {
    counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
    if (counts[q.category] !== undefined) counts[q.category] += 1;
  }
  root.innerHTML = `
    ${brandBar()}
    <div class="admin-shell">
      <div class="admin-head">
        <div>
          <div class="eyebrow">${escapeHtml(state.config.brand.programName)} · staff only · ${APP_VERSION_LABEL}</div>
          <h1>Game configuration</h1>
          <p class="muted">Add places and photos, set scoring and timers, then export the leaderboard.</p>
        </div>
        <a class="btn btn-ghost" href="${withBase("/")}">Back to game</a>
      </div>
      ${state.message ? `<p class="admin-banner">${escapeHtml(state.message)}</p>` : ""}
      ${state.error ? `<p class="admin-banner error">${escapeHtml(state.error)}</p>` : ""}
      <div class="admin-tabs" role="tablist">
        ${tabBtn("questions", `Questions (${state.questions.length})`)}
        ${tabBtn("settings", "Settings")}
        ${tabBtn("players", "Players")}
      </div>
      <div class="admin-stats">
        <div class="admin-stat"><span class="tiny muted">Settlements / JNF / General</span><strong>${counts.settlements} / ${counts["jnf-sites"]} / ${counts["general-sites"]}</strong></div>
        <div class="admin-stat"><span class="tiny muted">Easy / medium / hard</span><strong>${counts.easy} / ${counts.medium} / ${counts.hard}</strong></div>
        <div class="admin-stat"><span class="tiny muted">Registered players</span><strong>${state.players.stats.players}</strong></div>
        <div class="admin-stat"><span class="tiny muted">Games played</span><strong>${state.players.stats.plays}</strong></div>
        <div class="admin-stat"><span class="tiny muted">Top score</span><strong>${Number(state.players.stats.topScore).toLocaleString("en-US")}</strong></div>
      </div>
      ${state.tab === "questions" ? questionsPanel() : ""}
      ${state.tab === "settings" ? settingsPanel() : ""}
      ${state.tab === "players" ? playersPanel() : ""}
    </div>
  `;
  bindChrome();
  if (state.tab === "questions") bindQuestions();
  if (state.tab === "settings") bindSettings();
  if (state.tab === "players") bindPlayers();
}

function tabBtn(id, label) {
  return `<button class="tab ${state.tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
}

function questionsPanel() {
  const list = state.questions.filter((q) => state.filter === "all" || q.category === state.filter || q.difficulty === state.filter);
  const cards = list
    .map(
      (q) => `
      <article class="q-card">
        ${
          q.image_url
            ? `<img src="${escapeAttr(withBase(q.image_url))}" alt="" />`
            : `<div class="ph">${escapeHtml(q.name.slice(0, 1))}</div>`
        }
        <div>
          <strong>${escapeHtml(q.name)}</strong>
          <p class="tiny muted">${escapeHtml(q.hint)}</p>
          <span class="diff">${escapeHtml(familyLabel(q.category))}</span>
          <span class="tiny muted"> · ${escapeHtml(q.difficulty)}</span>
        </div>
        <div class="q-actions">
          <button class="btn btn-ghost" data-edit="${escapeAttr(q.id)}">Edit</button>
          <button class="btn btn-ghost" data-delete="${escapeAttr(q.id)}">Delete</button>
        </div>
      </article>`
    )
    .join("");
  return `
    <div class="panel">
      <h3>How questions and photos are entered</h3>
      <p class="muted">Use <strong>Add place</strong> below. Type the English name and hint, choose easy / medium / hard, then click the map (or type coordinates) for the correct location. Add a photo by pasting an image URL or uploading a file from this computer — the photo is stored with the game and shown on that question.</p>
      <div class="admin-toolbar">
        <div class="tabs filter-tabs">
          ${["all", ...FAMILIES.map((f) => f.id)].map((f) => `<button class="tab ${state.filter === f ? "active" : ""}" data-filter="${f}">${f === "all" ? "all" : familyLabel(f)}</button>`).join("")}
        </div>
        <button class="btn btn-primary" id="add-place">Add place</button>
      </div>
      <div class="q-list">${cards || `<p class="muted">No places in this filter yet.</p>`}</div>
    </div>
    ${state.editing ? editorPanel() : ""}
  `;
}

function editorPanel() {
  const q = state.editing;
  const isNew = q.id === "";
  return `
    <div class="panel editor-panel">
      <h3>${isNew ? "Add a place" : "Edit place"}</h3>
      <form id="q-form" class="editor-grid">
        <div>
          <div class="field"><label for="q-name">Place name (English)</label><input id="q-name" name="name" value="${escapeAttr(q.name)}" required /></div>
          <div class="field"><label for="q-hint">Hint / description</label><textarea id="q-hint" name="hint" rows="3" required>${escapeHtml(q.hint)}</textarea></div>
          <div class="field-row">
            <div class="field"><label for="q-diff">Difficulty</label>
              <select id="q-diff" name="difficulty">
                ${["easy", "medium", "hard"].map((d) => `<option value="${d}" ${q.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label for="q-cat">Family</label>
              <select id="q-cat" name="category">
                ${FAMILIES.map((c) => `<option value="${c.id}" ${q.category === c.id ? "selected" : ""}>${c.label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label for="q-lat">Latitude</label><input id="q-lat" name="latitude" value="${q.latitude ?? ""}" /></div>
            <div class="field"><label for="q-lng">Longitude</label><input id="q-lng" name="longitude" value="${q.longitude ?? ""}" /></div>
          </div>
          <div class="field">
            <label for="q-image">Photo URL</label>
            <input id="q-image" name="image_url" value="${escapeAttr(q.image_url || "")}" placeholder="https://… or upload a file" />
          </div>
          <div class="field">
            <label for="q-file">Or upload a photo</label>
            <input id="q-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
            <p class="tiny muted">JPG, PNG, WebP, or GIF · 5 MB max</p>
          </div>
          <div class="photo-preview" id="photo-preview">${q.image_url ? `<img src="${escapeAttr(withBase(q.image_url))}" alt="Preview" />` : `<span class="muted tiny">No photo yet</span>`}</div>
        </div>
        <div>
          <label>Correct location — click the English map</label>
          <div class="map-picker" id="picker-map"></div>
          <p class="tiny muted">Drag the pin to fine-tune. The player never sees this pin until after they guess.</p>
        </div>
        <div class="editor-actions">
          <button class="btn btn-primary" type="submit">Save place</button>
          <button class="btn btn-ghost" type="button" id="cancel-edit">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function settingsPanel() {
  const g = state.config.game;
  const b = state.config.brand;
  const m = state.config.map;
  const reset = state.config.admin.leaderboardReset || "never";
  const mix = { ...DEFAULT_FAMILY_MIX, ...(g.familyMix || {}) };
  const split = splitFamilyCounts(g.questionsPerGame || 10, mix);
  return `
    <form id="settings-form">
      <div class="panel">
        <h3>Round shape</h3>
        <div class="field-row">
          ${numField("questionsPerGame", "Questions per game", g.questionsPerGame || 10)}
        </div>
        <p class="tiny muted">Each round is shuffled. Default mix is 50% settlements, 10% JNF sites, 40% general sites.</p>
        <div class="field-row">
          ${numField("mixSettlements", "Settlements %", mix.settlements)}
          ${numField("mixJnfSites", "JNF Sites %", mix["jnf-sites"])}
          ${numField("mixGeneralSites", "General Sites %", mix["general-sites"])}
        </div>
        <p class="tiny muted">A ${g.questionsPerGame || 10}-question game currently uses ${split.settlements} settlements, ${split["jnf-sites"]} JNF sites, ${split["general-sites"]} general sites.</p>
        <label class="check">
          <input type="checkbox" name="requireGuessConfirm" ${g.requireGuessConfirm ? "checked" : ""} />
          <span>Require players to confirm a map pin. If off, the first tap on the map is scored immediately</span>
        </label>
        <div class="field-row">
          ${numField("easyTimer", "Easy timer (seconds)", g.timerSeconds.easy)}
          ${numField("mediumTimer", "Medium timer (seconds)", g.timerSeconds.medium)}
          ${numField("hardTimer", "Hard timer (seconds)", g.timerSeconds.hard)}
        </div>
      </div>
      <div class="panel">
        <h3>Scoring</h3>
        <div class="field-row">
          ${numField("maxDistanceScore", "Max accuracy points", g.maxDistanceScore)}
          ${numField("perfectDistanceKm", "Perfect distance (km)", g.perfectDistanceKm, "0.1")}
          ${numField("zeroScoreDistanceKm", "Zero-score distance (km)", g.zeroScoreDistanceKm)}
          ${numField("distanceDecayK", "Distance decay K", g.distanceDecayK, "0.01")}
        </div>
        <div class="field-row">
          ${numField("maxSpeedBonus", "Max speed bonus", g.maxSpeedBonus)}
          ${numField("minSpeedBonus", "Min speed bonus", g.minSpeedBonus)}
          ${numField("speedFullBonusRatio", "Full bonus for first half of time (0–1)", g.speedFullBonusRatio, "0.05")}
          ${numField("feedbackSeconds", "Feedback pause (seconds)", Math.round(g.feedbackAutoAdvanceMs / 1000))}
        </div>
        <div class="field-row">
          ${numField("leaderboardTop", "Leaderboard size", g.leaderboardTop)}
          <div class="field"><label for="conferenceEndDate">Conference end date</label><input id="conferenceEndDate" name="conferenceEndDate" type="date" value="${escapeAttr(g.conferenceEndDate || "")}" /></div>
        </div>
      </div>
      <div class="panel">
        <h3>Text and links</h3>
        <div class="field-row">
          <div class="field"><label for="gameTitle">Game title</label><input id="gameTitle" name="gameTitle" value="${escapeAttr(b.gameTitle)}" /></div>
          <div class="field"><label for="tagline">Tagline</label><input id="tagline" name="tagline" value="${escapeAttr(b.tagline)}" /></div>
        </div>
        <div class="field"><label for="learnMoreTitle">Learn-more title</label><input id="learnMoreTitle" name="learnMoreTitle" value="${escapeAttr(b.learnMoreTitle)}" /></div>
        <div class="field"><label for="learnMoreBody">Learn-more text</label><textarea id="learnMoreBody" name="learnMoreBody" rows="4">${escapeHtml(b.learnMoreBody)}</textarea></div>
        <div class="field"><label for="boothCta">Booth invitation</label><input id="boothCta" name="boothCta" value="${escapeAttr(b.boothCta)}" /></div>
        <div class="field"><label for="learnMoreUrl">Learn-more URL</label><input id="learnMoreUrl" name="learnMoreUrl" value="${escapeAttr(b.learnMoreUrl)}" /></div>
        <div class="field"><label for="privacyPolicyUrl">Privacy policy URL</label><input id="privacyPolicyUrl" name="privacyPolicyUrl" value="${escapeAttr(b.privacyPolicyUrl)}" /></div>
      </div>
      <div class="panel">
        <h3>Map and access</h3>
        <div class="field-row">
          ${numField("defaultZoom", "Default zoom", m.defaultZoom)}
          ${numField("minZoom", "Min zoom", m.minZoom)}
          ${numField("maxZoom", "Max zoom", m.maxZoom)}
        </div>
        <div class="field"><label for="adminPin">Admin PIN</label><input id="adminPin" name="adminPin" value="${escapeAttr(state.config.admin.pin)}" /></div>
      </div>
      <div class="panel">
        <h3>Players database</h3>
        <p class="muted">Clear registered names, contacts, and scores. Automatic clearing runs when someone next plays or opens the leaderboard.</p>
        <div class="field">
          <label for="leaderboardReset">Automatically clear users</label>
          <select id="leaderboardReset" name="leaderboardReset">
            <option value="never" ${reset === "never" ? "selected" : ""}>Never</option>
            <option value="daily" ${reset === "daily" ? "selected" : ""}>Every day</option>
            <option value="monthly" ${reset === "monthly" ? "selected" : ""}>Every month</option>
          </select>
        </div>
        <button class="btn btn-danger" type="button" id="clear-players">Clear users database</button>
      </div>
      <div class="action-row" style="max-width:420px">
        <button class="btn btn-primary" type="submit">Save settings</button>
      </div>
    </form>
  `;
}

function numField(name, label, value, step = "1") {
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="number" step="${step}" value="${value}" /></div>`;
}

function playersPanel() {
  const rows = state.players.players
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.email || "")}</td>
        <td>${escapeHtml(p.phone || "")}</td>
        <td>${Number(p.highScore).toLocaleString("en-US")}</td>
        <td>${p.plays}</td>
      </tr>`
    )
    .join("");
  return `
    <div class="panel">
      <h3>Registered players</h3>
      <p class="muted">Emails and phone numbers stay off the public leaderboard. Export this list to contact prize winners.</p>
      <div class="action-row" style="max-width:420px">
        <button class="btn btn-primary" id="export" type="button">Export CSV</button>
        <button class="btn btn-danger" id="clear-players" type="button">Clear users database</button>
      </div>
      <div class="table-wrap" style="max-height:none;margin-top:1rem">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>High score</th><th>Plays</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6">No registered players yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function bindChrome() {
  root.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tab = btn.dataset.tab;
      state.editing = null;
      state.message = "";
      state.error = "";
      render();
    });
  });
}

function bindQuestions() {
  root.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      render();
    });
  });
  root.querySelector("#add-place")?.addEventListener("click", () => {
    state.editing = blankQuestion();
    state.message = "";
    render();
    root.querySelector(".editor-panel")?.scrollIntoView({ behavior: "smooth" });
  });
  root.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.editing = { ...state.questions.find((q) => q.id === btn.dataset.edit) };
      render();
      root.querySelector(".editor-panel")?.scrollIntoView({ behavior: "smooth" });
    });
  });
  root.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this place from the question bank?")) return;
      try {
        const data = await api(`/api/admin/questions/${encodeURIComponent(btn.dataset.delete)}`, { method: "DELETE" });
        state.questions = data.questions;
        if (state.editing?.id === btn.dataset.delete) state.editing = null;
        flash("Place deleted.");
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
  });
  const form = root.querySelector("#q-form");
  if (!form) return;
  root.querySelector("#cancel-edit")?.addEventListener("click", () => {
    state.editing = null;
    render();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveQuestion(new FormData(form));
  });
  root.querySelector("#q-file")?.addEventListener("change", uploadPhoto);
  root.querySelector("#q-image")?.addEventListener("input", (event) => {
    previewPhoto(event.target.value);
    if (state.editing) state.editing.image_url = event.target.value;
  });
  mountPicker();
}

function mountPicker() {
  const el = root.querySelector("#picker-map");
  if (!el) return;
  state.picker = createIsraelMap(el, state.config.map);
  const latInput = root.querySelector("#q-lat");
  const lngInput = root.querySelector("#q-lng");
  const sync = ({ lat, lng }) => {
    latInput.value = lat.toFixed(5);
    lngInput.value = lng.toFixed(5);
    if (state.editing) {
      state.editing.latitude = lat;
      state.editing.longitude = lng;
    }
  };
  state.picker.setOnGuess(sync);
  const lat = Number(state.editing?.latitude);
  const lng = Number(state.editing?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    state.picker.setMarker(lat, lng);
  }
  state.picker.invalidate();
  latInput.addEventListener("change", () => {
    const nextLat = Number(latInput.value);
    const nextLng = Number(lngInput.value);
    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) state.picker.setMarker(nextLat, nextLng);
  });
  lngInput.addEventListener("change", () => {
    const nextLat = Number(latInput.value);
    const nextLng = Number(lngInput.value);
    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) state.picker.setMarker(nextLat, nextLng);
  });
}

function destroyPicker() {
  if (state.picker) {
    state.picker.destroy();
    state.picker = null;
  }
}

async function uploadPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readFile(file);
    const data = await api("/api/admin/upload", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, dataUrl }),
    });
    const input = root.querySelector("#q-image");
    if (input) input.value = data.url;
    if (state.editing) state.editing.image_url = data.url;
    previewPhoto(data.url);
    flash("Photo uploaded. Save the place to keep it.");
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function previewPhoto(url) {
  const box = root.querySelector("#photo-preview");
  if (!box) return;
  box.innerHTML = url ? `<img src="${escapeAttr(withBase(url))}" alt="Preview" />` : `<span class="muted tiny">No photo yet</span>`;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

async function saveQuestion(data) {
  const payload = {
    id: state.editing.id,
    name: String(data.get("name") || ""),
    hint: String(data.get("hint") || ""),
    difficulty: String(data.get("difficulty") || "medium"),
    category: String(data.get("category") || ""),
    latitude: Number(data.get("latitude")),
    longitude: Number(data.get("longitude")),
    image_url: String(data.get("image_url") || ""),
  };
  try {
    const isNew = !state.editing.id;
    const result = isNew
      ? await api("/api/admin/questions", { method: "POST", body: JSON.stringify(payload) })
      : await api(`/api/admin/questions/${encodeURIComponent(state.editing.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
    state.questions = result.questions;
    state.editing = null;
    flash(isNew ? "Place added to the question bank." : "Place updated.");
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function bindSettings() {
  bindClearPlayers();
  root.querySelector("#settings-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const num = (name) => Number(data.get(name));
    const patch = {
      brand: {
        gameTitle: String(data.get("gameTitle") || ""),
        tagline: String(data.get("tagline") || ""),
        learnMoreTitle: String(data.get("learnMoreTitle") || ""),
        learnMoreBody: String(data.get("learnMoreBody") || ""),
        boothCta: String(data.get("boothCta") || ""),
        learnMoreUrl: String(data.get("learnMoreUrl") || ""),
        privacyPolicyUrl: String(data.get("privacyPolicyUrl") || ""),
      },
      game: {
        questionsPerGame: num("questionsPerGame"),
        familyMix: {
          settlements: num("mixSettlements"),
          "jnf-sites": num("mixJnfSites"),
          "general-sites": num("mixGeneralSites"),
        },
        requireGuessConfirm: data.get("requireGuessConfirm") === "on",
        timerSeconds: {
          easy: num("easyTimer"),
          medium: num("mediumTimer"),
          hard: num("hardTimer"),
        },
        maxDistanceScore: num("maxDistanceScore"),
        perfectDistanceKm: num("perfectDistanceKm"),
        zeroScoreDistanceKm: num("zeroScoreDistanceKm"),
        distanceDecayK: num("distanceDecayK"),
        maxSpeedBonus: num("maxSpeedBonus"),
        minSpeedBonus: num("minSpeedBonus"),
        speedFullBonusRatio: num("speedFullBonusRatio"),
        feedbackAutoAdvanceMs: num("feedbackSeconds") * 1000,
        leaderboardTop: num("leaderboardTop"),
        conferenceEndDate: String(data.get("conferenceEndDate") || ""),
      },
      map: {
        defaultZoom: num("defaultZoom"),
        minZoom: num("minZoom"),
        maxZoom: num("maxZoom"),
      },
      admin: {
        pin: String(data.get("adminPin") || ""),
        leaderboardReset: String(data.get("leaderboardReset") || "never"),
      },
    };
    try {
      const result = await api("/api/admin/config", { method: "PUT", body: JSON.stringify(patch) });
      state.config = result.config;
      if (result.config.admin.pin !== state.pin) {
        state.pin = result.config.admin.pin;
        sessionStorage.setItem(pinKey, state.pin);
      }
      flash("Settings saved. New games will use these values.");
    } catch (error) {
      state.error = error.message;
      render();
    }
  });
}

function bindPlayers() {
  bindClearPlayers();
  root.querySelector("#export")?.addEventListener("click", () => {
    location.href = withBase(`/api/admin/export?pin=${encodeURIComponent(state.pin)}`);
  });
}

function bindClearPlayers() {
  root.querySelector("#clear-players")?.addEventListener("click", async () => {
    if (!confirm("Clear all registered players and scores? This cannot be undone.")) return;
    try {
      const data = await api("/api/admin/players/clear", { method: "POST" });
      state.players = { players: data.players || [], stats: data.stats };
      flash("Users database cleared.");
    } catch (error) {
      state.error = error.message;
      render();
    }
  });
}

function blankQuestion() {
  return {
    id: "",
    name: "",
    hint: "",
    image_url: "",
    latitude: "",
    longitude: "",
    difficulty: "easy",
    category: "settlements",
  };
}

function flash(message) {
  state.message = message;
  state.error = "";
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

boot();
