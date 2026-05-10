# homeassistant-health

Home Assistant add-on repository for a family health tracker.

## Architecture

*   Bun runtime and package manager
*   Vite + React browser app
*   Bun API server for persistence and Home Assistant integration
*   SQLite via `bun:sqlite`

## Expected Layout

```text
health-tracker/
  config.yaml             Home Assistant add-on metadata
  build.yaml              Home Assistant builder config
  Dockerfile              Add-on image build
  rootfs/
    app/
      package.json
      vite.config.ts      Vite config, use base: "./" for embedded ingress
      src/client/         React SPA
      src/server/         Bun API/static server
      src/lib/            SQLite, calculations, shared types
      tests/              Bun tests
```

## Commands

```bash
mise install              # Install Bun, hook tools, linters
mise tasks                # List available tasks
mise run deps             # Install app dependencies
mise run dev              # Start the app dev server
mise run build            # Build production assets/server
mise run test             # Run Bun tests
mise run lint             # Run Biome checks
mise run dockerfile:lint  # Run hadolint against Dockerfiles
mise run rumdl            # Lint Markdown
mise run check            # Run local verification
mise run pre-commit       # Run hk pre-commit hook
```

Until `health-tracker/rootfs/app/package.json` exists, app-scoped tasks print a skip message instead of failing.

## Tooling

*   Project tasks live in `tasks.toml`; longer shell bodies can live in `.mise/tasks/` when they are worth splitting out.
*   Git hooks are managed by `hk.pkl`; install with `mise exec -- hk install --mise`.
*   Markdown linting uses `rumdl` and `.rumdl.toml`.
*   Dockerfile linting uses `hadolint`.
*   `AGENTS.md` is a symlink to this file so Codex and Claude share the same repo instructions.

## Development Notes

*   Keep Home Assistant ingress in mind. Vite should use a relative base (`"./"`) so built assets work under Supervisor-provided paths.
*   Keep server-only code out of the React bundle. SQLite, Supervisor API calls, and filesystem access belong under `src/server/` or `src/lib/` modules imported only by the server.
*   Prefer small, explicit API endpoints under `/api/*`; keep routing and request handling plain.
*   Do not commit local secrets, Home Assistant tokens, SQLite databases, or `.claude/settings.local.json`.
