import { withBase } from "./base.js";
import { createIsraelMap } from "./map.js";
import { createApi } from "./api.js";
import { brandBar } from "./brand.js";
import { validateGuest, validateRegistered, firstError } from "./validate.js";
import { formatDistance, formatScore } from "../shared/geo.js";
import { APP_VERSION_LABEL } from "../shared/version.js";
import { scoreGuess, timerFor, sanitizeQuestion } from "../shared/scoring.js";
import { emptyCheerState, pickQuestionCheer } from "./cheer.js";
import { familyLabel } from "../shared/families.js";

export function createApp(root, { config, questions }) {
  const api = createApi();
  const game = config.game;
  const brand = config.brand;

  const state = {
    screen: "landing",
    player: null,
    seenHowTo: false,
    sessionId: null,
    remote: false,
    round: [],
    index: 0,
    current: null,
    guess: null,
    startedAt: 0,
    remainingMs: 0,
    results: [],
    total: 0,
    feedback: null,
    summary: null,
    form: { mode: "registered", name: "", email: "", phone: "", consent: false },
    error: "",
    ticking: null,
    map: null,
    autoNext: null,
    busy: false,
    cheer: emptyCheerState(),
  };

  function questionAt(index) {
    return state.round[index];
  }

  function durationMs(question) {
    return timerFor(question.difficulty, game);
  }

  function render() {
    teardownTimers();
    const stayOnPlay = state.screen === "play" && state.map && root.querySelector("#map");
    if (stayOnPlay) {
      updatePlayChrome();
      return;
    }
    if (state.map) {
      state.map.destroy();
      state.map = null;
    }
    const views = { landing, identity, howTo, play, results };
    root.innerHTML = views[state.screen]();
    bind();
  }

  function landing() {
    const n = game.questionsPerGame || 10;
    return `
      <section class="screen landing">
        ${brandBar()}
        <div class="hero">
          <div class="eyebrow">Map challenge</div>
          <h1>${brand.gameTitle}</h1>
          <p>${brand.tagline} ${n} places. Tap the map of Israel and race the clock.</p>
        </div>
        <div class="landing-actions">
          <button class="btn btn-primary btn-wide" data-go="identity">Start Game</button>
          <span class="tiny muted">Built for the annual conference · Play on phone, tablet, or desktop</span>
          <span class="version-tag">${APP_VERSION_LABEL}</span>
        </div>
      </section>
    `;
  }

  function identity() {
    const { mode, name, email, phone, consent } = state.form;
    return `
      <section class="screen sheet">
        ${brandBar()}
        <div class="sheet-inner">
          <div class="eyebrow">${brand.programName}</div>
          <h1>Who is playing?</h1>
          <p class="muted">Join the conference leaderboard, or play as a guest.</p>
          <div class="tabs" role="tablist">
            <button class="tab ${mode === "registered" ? "active" : ""}" data-mode="registered">Join leaderboard</button>
            <button class="tab ${mode === "guest" ? "active" : ""}" data-mode="guest">Play as guest</button>
          </div>
          <form id="id-form">
            <div class="field">
              <label for="name">Full name</label>
              <input id="name" name="name" autocomplete="name" value="${escapeAttr(name)}" required />
            </div>
            ${
              mode === "registered"
                ? `
              <div class="field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" autocomplete="email" value="${escapeAttr(email)}" />
              </div>
              <div class="field">
                <label for="phone">Phone</label>
                <input id="phone" name="phone" type="tel" autocomplete="tel" value="${escapeAttr(phone)}" />
              </div>
              <p class="tiny muted">Email or phone is required so we can contact prize winners. Contact details stay off the public board.</p>
              <label class="check">
                <input type="checkbox" name="consent" ${consent ? "checked" : ""} />
                <span>I agree that ${brand.orgName} / ${brand.programName} may store my name and contact details to reach me if I win a prize, in line with their <a href="${brand.privacyPolicyUrl}" target="_blank" rel="noreferrer">privacy policy</a>.</span>
              </label>
            `
                : `<p class="tiny muted">Guest scores are shown only to you. You can join the leaderboard after the game if you like.</p>`
            }
            ${state.error ? `<p class="error" style="color:#c24b2a">${escapeHtml(state.error)}</p>` : ""}
            <div class="action-row" style="margin-top:1.2rem">
              <button type="submit" class="btn btn-primary">${mode === "guest" ? "Continue as guest" : "Continue"}</button>
              <button type="button" class="btn btn-ghost" data-go="landing">Back</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  function howTo() {
    const n = game.questionsPerGame || 10;
    const confirmText = game.requireGuessConfirm
      ? "Drop a pin on your best guess, then confirm that location. You can drag the pin to adjust."
      : "Tap the map once to place your guess. That tap is scored immediately.";
    return `
      <section class="screen sheet">
        ${brandBar()}
        <div class="sheet-inner">
          <div class="eyebrow">How to play</div>
          <h1>Guess the location of each place on the map of Israel.</h1>
          <div class="card-list">
            <article class="how-card"><div class="num">1</div><div><strong>Read the clue</strong><p class="muted tiny">Each round names a place, with a short hint and photo when available.</p></div></article>
            <article class="how-card"><div class="num">2</div><div><strong>Tap the map${game.requireGuessConfirm ? ", then confirm" : ""}</strong><p class="muted tiny">${confirmText}</p></div></article>
            <article class="how-card"><div class="num">3</div><div><strong>Accuracy + speed</strong><p class="muted tiny">Closer and faster scores more — up to 5,000 points per place. The clock is visible on every question.</p></div></article>
            <article class="how-card"><div class="num">4</div><div><strong>${n} questions, mixed places</strong><p class="muted tiny">Each round mixes settlements, JNF sites, and general sites in random order. If time runs out, that question scores zero.</p></div></article>
          </div>
          <button class="btn btn-primary btn-wide" data-action="begin">Start</button>
        </div>
      </section>
    `;
  }

  function playTopHTML() {
    const n = state.index + 1;
    const totalQ = state.round.length || game.questionsPerGame;
    return `
      <div class="pill">Q ${n}/${totalQ}</div>
      <div class="timer-wrap" aria-hidden="true"><div class="timer-bar" id="timer-bar"></div></div>
      <div class="pill" id="timer-label">0:00</div>
      <div class="pill" id="score-pill">${formatScore(state.total)}</div>
    `;
  }

  function clueHTML() {
    const q = state.current;
    const image = q.image_url
      ? `<img src="${escapeAttr(withBase(q.image_url))}" alt="" data-q-image />`
      : `<div class="ph">${q.name.slice(0, 1)}</div>`;
    return `
      <div class="clue">
        ${image}
        <div>
          <h2>${escapeHtml(q.name)}</h2>
          <p>${escapeHtml(q.hint)}</p>
          <span class="diff">${escapeHtml(familyLabel(q.category))}</span>
        </div>
      </div>
    `;
  }

  function feedbackHTML() {
    const cheer = state.feedback.cheer;
    return `
      <div class="feedback-panel">
        <div class="stat"><div class="label">Distance</div><div class="value">${state.feedback.timedOut ? "Time up" : formatDistance(state.feedback.distanceKm)}</div></div>
        <div class="stat"><div class="label">This place</div><div class="value">+${formatScore(state.feedback.questionScore)}</div></div>
        <div class="stat"><div class="label">Total</div><div class="value">${formatScore(state.total)}</div></div>
        ${
          cheer
            ? `<p class="cheer cheer-${cheer.kind}">${escapeHtml(cheer.text)}</p>`
            : ""
        }
      </div>
    `;
  }

  function playBottomHTML() {
    if (state.feedback) {
      const last = state.index + 1 >= (state.round.length || game.questionsPerGame);
      return `<button class="btn btn-primary btn-wide" data-action="next">${last ? "See results" : "Next question"}</button>`;
    }
    if (game.requireGuessConfirm) {
      if (!state.guess) {
        return `<p class="confirm-hint">Tap the map to place your guess, then confirm it.</p>`;
      }
      return `
        <div class="confirm-bar">
          <p>Confirm this location?</p>
          <button class="btn btn-primary" data-action="submit">Confirm</button>
          <button class="btn btn-ghost" data-action="move">Move pin</button>
        </div>
      `;
    }
    return `<p class="confirm-hint">Tap the map to place your guess.</p>`;
  }

  function play() {
    return `
      <section class="screen play">
        ${brandBar()}
        <div class="play-top">${playTopHTML()}</div>
        <div class="play-body">
          ${state.feedback ? feedbackHTML() : clueHTML()}
          <div class="map-wrap" id="map"></div>
          <div class="play-bottom">${playBottomHTML()}</div>
        </div>
      </section>
    `;
  }

  function updatePlayChrome() {
    const top = root.querySelector(".play-top");
    const side = root.querySelector(".clue, .feedback-panel");
    const bottom = root.querySelector(".play-bottom");
    if (top) top.innerHTML = playTopHTML();
    if (bottom) bottom.innerHTML = playBottomHTML();
    if (side) {
      side.outerHTML = state.feedback ? feedbackHTML() : clueHTML();
    }
    bindImageFallback();
    root.querySelector("[data-action='submit']")?.addEventListener("click", () => submitGuess());
    root.querySelector("[data-action='next']")?.addEventListener("click", () => advance());
    root.querySelector("[data-action='move']")?.addEventListener("click", () => {
      state.map?.enableClicks(true);
    });
    if (state.feedback) {
      state.map.enableClicks(false);
      state.map.showResult(state.guess, {
        lat: state.feedback.correct.lat,
        lng: state.feedback.correct.lng,
      });
      state.autoNext = setTimeout(() => advance(), game.feedbackAutoAdvanceMs);
    } else {
      state.map.clearGuess();
      state.map.enableClicks(true);
      startClock();
    }
  }

  function results() {
    const s = state.summary;
    const rows = state.results
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${r.timedOut ? "—" : formatDistance(r.distanceKm)}</td>
          <td>${formatScore(r.questionScore)}</td>
        </tr>`
      )
      .join("");
    const board = (s.leaderboard || [])
      .map(
        (row) => `
        <tr class="${s.rank === row.rank ? "rank-you" : ""}">
          <td>#${row.rank}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${formatScore(row.score)}</td>
        </tr>`
      )
      .join("");
    const rankLine =
      state.player.mode === "registered" && s.rank
        ? `You ranked #${s.rank} out of ${s.playerCount} players`
        : state.player.mode === "guest"
          ? "Playing as a guest — your score is not on the public board yet."
          : "Thanks for playing.";

    return `
      <section class="screen results">
        ${brandBar()}
        <div class="results-inner">
          <div class="score-hero">
            <div class="eyebrow">Total score</div>
            <div class="total">${formatScore(s.totalScore)}</div>
            <p>${rankLine}</p>
          </div>
          <div class="panel">
            <h3>Your round</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Place</th><th>Distance</th><th>Points</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
          <div class="panel">
            <h3>Leaderboard</h3>
            ${
              board
                ? `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Name</th><th>Best</th></tr></thead><tbody>${board}</tbody></table></div>`
                : `<p class="muted">Be the first to join the board.</p>`
            }
            ${
              state.player.mode === "guest"
                ? `
              <form id="join-form" style="margin-top:1rem">
                <p class="tiny"><strong>Enter your details to join the leaderboard</strong></p>
                <div class="field"><label for="join-email">Email</label><input id="join-email" name="email" type="email" /></div>
                <div class="field"><label for="join-phone">Phone</label><input id="join-phone" name="phone" type="tel" /></div>
                <label class="check"><input type="checkbox" name="consent" required /><span>I agree that my name and contact details may be stored to contact prize winners.</span></label>
                ${state.error ? `<p class="error" style="color:#c24b2a">${escapeHtml(state.error)}</p>` : ""}
                <button class="btn btn-dark btn-wide" style="margin-top:0.8rem" type="submit">Join the leaderboard</button>
              </form>`
                : ""
            }
          </div>
          <div class="panel learn-more">
            <h3>${escapeHtml(brand.learnMoreTitle)}</h3>
            <p>${escapeHtml(brand.learnMoreBody)}</p>
            <p><strong>${escapeHtml(brand.boothCta)}</strong></p>
            <a class="btn btn-dark btn-wide" href="${brand.learnMoreUrl}" target="_blank" rel="noreferrer">Learn more about Green Horizons</a>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" data-action="again">Play Again</button>
            <button class="btn btn-ghost" data-action="share">Share my score</button>
          </div>
        </div>
      </section>
    `;
  }

  function bind() {
    root.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.error = "";
        go(btn.dataset.go);
      });
    });
    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const form = root.querySelector("#id-form");
        if (form) {
          const data = new FormData(form);
          state.form.name = String(data.get("name") || state.form.name);
          state.form.email = String(data.get("email") || state.form.email);
          state.form.phone = String(data.get("phone") || state.form.phone);
          state.form.consent = data.get("consent") === "on" || state.form.consent;
        }
        state.form.mode = btn.dataset.mode;
        state.error = "";
        render();
      });
    });

    const idForm = root.querySelector("#id-form");
    if (idForm) {
      idForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(idForm);
        state.form.name = String(data.get("name") || "");
        state.form.email = String(data.get("email") || "");
        state.form.phone = String(data.get("phone") || "");
        state.form.consent = data.get("consent") === "on";
        const errors =
          state.form.mode === "guest" ? validateGuest(state.form) : validateRegistered(state.form);
        if (Object.keys(errors).length) {
          state.error = firstError(errors);
          render();
          return;
        }
        state.player = {
          mode: state.form.mode,
          name: state.form.name.trim(),
          email: state.form.email.trim(),
          phone: state.form.phone.trim(),
          consent: state.form.consent,
        };
        state.error = "";
        go(state.seenHowTo ? "play-start" : "howTo");
      });
    }

    root.querySelector("[data-action='begin']")?.addEventListener("click", () => {
      state.seenHowTo = true;
      startRound();
    });
    root.querySelector("[data-action='submit']")?.addEventListener("click", () => submitGuess());
    root.querySelector("[data-action='next']")?.addEventListener("click", () => advance());
    root.querySelector("[data-action='again']")?.addEventListener("click", () => startRound());
    root.querySelector("[data-action='share']")?.addEventListener("click", shareScore);

    const join = root.querySelector("#join-form");
    if (join) {
      join.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(join);
        const next = {
          name: state.player.name,
          email: String(data.get("email") || ""),
          phone: String(data.get("phone") || ""),
          consent: data.get("consent") === "on",
        };
        const errors = validateRegistered(next);
        if (Object.keys(errors).length) {
          state.error = firstError(errors);
          render();
          return;
        }
        try {
          const summary = await api.joinLeaderboard(next, state.total, state.results);
          state.player = { ...next, mode: "registered" };
          state.summary = summary;
          state.error = "";
          render();
        } catch (err) {
          state.error = err.message;
          render();
        }
      });
    }

    bindImageFallback();

    if (state.screen === "play") {
      mountMap();
      if (!state.feedback) startClock();
      else {
        state.map?.showResult(state.guess, {
          lat: state.feedback.correct.lat,
          lng: state.feedback.correct.lng,
        });
        const delay = game.feedbackAutoAdvanceMs;
        state.autoNext = setTimeout(() => advance(), delay);
      }
    }
  }

  function bindImageFallback() {
    const img = root.querySelector("[data-q-image]");
    if (img) {
      img.addEventListener("error", () => {
        const ph = document.createElement("div");
        ph.className = "ph";
        ph.textContent = state.current.name.slice(0, 1);
        img.replaceWith(ph);
      });
    }
  }

  function mountMap() {
    const el = root.querySelector("#map");
    if (!el) return;
    state.map = createIsraelMap(el, config.map);
    state.map.setOnGuess((guess) => {
      state.guess = guess;
      if (state.feedback || state.busy) return;
      if (game.requireGuessConfirm) {
        const bottom = root.querySelector(".play-bottom");
        if (bottom) {
          bottom.innerHTML = playBottomHTML();
          root.querySelector("[data-action='submit']")?.addEventListener("click", () => submitGuess());
          root.querySelector("[data-action='move']")?.addEventListener("click", () => {
            state.map?.enableClicks(true);
          });
        }
        return;
      }
      submitGuess();
    });
    if (state.feedback) {
      state.map.enableClicks(false);
    }
    state.map.invalidate();
  }

  function startClock() {
    const total = durationMs(state.current);
    const bar = root.querySelector("#timer-bar");
    const label = root.querySelector("#timer-label");
    const tick = () => {
      const elapsed = Date.now() - state.startedAt;
      state.remainingMs = Math.max(0, total - elapsed);
      const ratio = state.remainingMs / total;
      if (bar) {
        bar.style.transform = `scaleX(${ratio})`;
        bar.classList.toggle("warn", ratio < 0.25);
      }
      if (label) label.textContent = formatClock(state.remainingMs);
      if (state.remainingMs <= 0) {
        teardownTimers();
        timeoutQuestion();
      }
    };
    tick();
    state.ticking = setInterval(tick, 100);
  }

  function teardownTimers() {
    if (state.ticking) clearInterval(state.ticking);
    if (state.autoNext) clearTimeout(state.autoNext);
    state.ticking = null;
    state.autoNext = null;
  }

  async function startRound() {
    state.error = "";
    state.results = [];
    state.total = 0;
    state.index = 0;
    state.guess = null;
    state.feedback = null;
    state.summary = null;
    state.cheer = emptyCheerState();
    try {
      const session = await api.startSession(state.player, questions, game);
      state.sessionId = session.sessionId;
      state.remote = !session.local;
      if (session.local) {
        state.round = session.round;
      } else {
        state.round = [];
      }
      await loadQuestion();
    } catch (err) {
      state.error = err.message;
      go("identity");
    }
  }

  async function loadQuestion() {
    if (state.remote) {
      const payload = await api.nextQuestion(state.sessionId);
      if (payload.done) {
        await finishGame();
        return;
      }
      state.current = payload.question;
      state.index = payload.index;
      state.round.length = payload.total;
    } else {
      if (state.index >= state.round.length) {
        await finishGame();
        return;
      }
      state.current = sanitizeQuestion(state.round[state.index]);
    }
    state.guess = null;
    state.feedback = null;
    state.startedAt = Date.now();
    state.screen = "play";
    render();
  }

  async function submitGuess() {
    if (!state.guess || state.feedback || state.busy) return;
    state.busy = true;
    state.map?.enableClicks(false);
    teardownTimers();
    const elapsed = Date.now() - state.startedAt;
    try {
      let scored;
      if (state.remote) {
        scored = await api.submitGuess(state.sessionId, {
          lat: state.guess.lat,
          lng: state.guess.lng,
        });
      } else {
        const full = questionAt(state.index);
        scored = scoreGuess({
          guess: state.guess,
          target: { lat: full.latitude, lng: full.longitude },
          elapsedMs: elapsed,
          durationMs: durationMs(full),
          game,
        });
        scored.correct = { lat: full.latitude, lng: full.longitude };
      }
      applyFeedback(scored, false);
    } catch (err) {
      state.error = err.message;
      render();
    } finally {
      state.busy = false;
    }
  }

  function timeoutQuestion() {
    const full = state.remote ? null : questionAt(state.index);
    const correct = full
      ? { lat: full.latitude, lng: full.longitude }
      : state.current?.reveal || null;
    const scored = {
      distanceKm: null,
      distanceScore: 0,
      speedBonus: 0,
      questionScore: 0,
      correct: correct || { lat: config.map.center[0], lng: config.map.center[1] },
      timedOut: true,
    };
    if (state.remote) {
      api.submitGuess(state.sessionId, { timedOut: true }).then((remoteScored) => {
        applyFeedback({ ...remoteScored, timedOut: true }, true);
      }).catch(() => applyFeedback(scored, true));
      return;
    }
    applyFeedback(scored, true);
  }

  function applyFeedback(scored, timedOut) {
    const entry = {
      id: state.current.id,
      name: state.current.name,
      distanceKm: scored.distanceKm,
      questionScore: scored.questionScore,
      distanceScore: scored.distanceScore,
      speedBonus: scored.speedBonus,
      timedOut,
    };
    state.results.push(entry);
    state.total += scored.questionScore;
    const cheer = pickQuestionCheer(scored.questionScore, state.cheer);
    state.feedback = { ...scored, timedOut, correct: scored.correct, cheer };
    if (timedOut) state.guess = null;
    render();
  }

  async function advance() {
    if (state.busy) return;
    state.busy = true;
    teardownTimers();
    try {
      if (!state.remote) state.index += 1;
      await loadQuestion();
    } finally {
      state.busy = false;
    }
  }

  async function finishGame() {
    const summary = await api.complete(state.sessionId, {
      player: state.player,
      totalScore: state.total,
      breakdown: state.results,
    });
    state.summary = summary;
    state.screen = "results";
    render();
  }

  async function shareScore() {
    const text = `I scored ${formatScore(state.total)} points in ${brand.programName}: ${brand.gameTitle}! Think you know the map of Israel?`;
    const url = location.href.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: brand.gameTitle, text, url });
        return;
      }
    } catch {
      /* user cancelled */
    }
    location.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  }

  function go(name) {
    if (name === "play-start") {
      startRound();
      return;
    }
    state.screen = name;
    render();
  }

  render();
  return { go };
}

function formatClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
