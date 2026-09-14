import "./styles.css";
import { createApp } from "./app.js";

async function boot() {
  const root = document.getElementById("app");
  try {
    const [configRes, questionsRes] = await Promise.all([
      fetch("/config.json"),
      fetch("/questions.json"),
    ]);
    if (!configRes.ok || !questionsRes.ok) throw new Error("Missing game data files");
    const config = await configRes.json();
    const questionsFile = await questionsRes.json();
    createApp(root, { config, questions: questionsFile.questions });
  } catch (error) {
    root.innerHTML = `
      <section class="screen sheet">
        <div class="sheet-inner">
          <h1>Guess the Place</h1>
          <p>The game could not load its question bank or settings. Check that <code>config.json</code> and <code>questions.json</code> are available.</p>
          <p class="muted">${error.message}</p>
        </div>
      </section>
    `;
  }
}

boot();
