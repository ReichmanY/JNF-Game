import { withBase } from "./base.js";

export function brandBar() {
  return `
    <header class="brand-bar">
      <img src="${withBase("/logos/jnf.png")}" alt="Jewish National Fund" class="logo-side" />
      <img src="${withBase("/logos/green-horizons.png")}" alt="Green Horizons" class="logo-center" />
      <img src="${withBase("/logos/kkl.png")}" alt="Keren Kayemeth LeIsrael" class="logo-side" />
    </header>
  `;
}
