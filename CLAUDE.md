# homeassistant-health

Home Assistant add-on repository for a family health tracker.

## Architecture

*   Bun runtime, package manager, bundler, and test runner
*   Bun fullstack server with HTML imports
*   React browser app
*   SQLite via `bun:sqlite` for persistence

## Expected Layout

```text
repository.yaml           Home Assistant app repository metadata
health-tracker/
  translations/en.yaml    Home Assistant app translations
  apparmor.txt            AppArmor profile
  CHANGELOG.md            app changelog
  config.yaml             Home Assistant app metadata
  DOCS.md                 app documentation
  Dockerfile              app image build
  icon.png                square app icon
  logo.png                app logo
  README.md               app store intro
  run.sh                  container start script
  package.json            Bun app package
  bun.lock                Bun dependency lockfile
  src/client/             React browser app
  src/server/             Bun API/static server
  src/lib/                SQLite, calculations, shared types
  tests/                  Bun tests
```

## Commands

```bash
mise install              # Install Bun, hook tools, linters
mise tasks                # List available tasks
mise run deps             # Install app dependencies
mise run dev              # Start the app dev server
mise run build            # Build production assets/server
mise run test             # Run all tests
mise run test:ts          # Run Bun tests
mise run lint             # Run all lint checks
mise run lint:ts          # Run Biome checks
mise run lint:docker      # Run hadolint against Dockerfiles
mise run lint:md          # Lint Markdown
mise run check            # Run local verification
mise run pre-commit       # Run hk pre-commit hook
```

## Tooling

*   Project tasks live in `tasks.toml`; longer shell bodies can live in `.mise/tasks/` when they are worth splitting out.
*   Git hooks are managed by `hk.pkl`; install with `mise exec -- hk install --mise`.
*   Markdown linting uses `rumdl` and `.rumdl.toml`.
*   Dockerfile linting uses `hadolint`.
*   `AGENTS.md` is a symlink to this file so Codex and Claude share the same repo instructions.

## Development Notes

*   Keep Home Assistant ingress in mind. Bun HTML imports should avoid assumptions about fixed external asset paths.
*   Keep `health-tracker/README.md` as the Home Assistant store intro. Use `health-tracker/DOCS.md` for usage details, routes, storage, and local build notes.
*   Keep server-only code out of the React bundle. SQLite, Supervisor API calls, and filesystem access belong under `health-tracker/src/server/` or `health-tracker/src/lib/` modules imported only by the server.
*   Prefer small, explicit API endpoints under `/api/*`; keep routing and request handling plain.
*   Do not commit local secrets, Home Assistant tokens, SQLite databases, or `.claude/settings.local.json`.
