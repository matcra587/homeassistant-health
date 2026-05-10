/**
 * Minimal global fixtures bootstrap.
 *
 * The store overwrites `window.__fixtures.today` and `.household` on bootstrap,
 * so this just guarantees the keys exist before the API response lands and a
 * date renderer asks for them. Demo seed data lived here during development;
 * production runs against the real SQLite store, so the seed is gone.
 */
if (typeof window !== "undefined" && !window.__fixtures) {
  window.__fixtures = { today: new Date() };
}
