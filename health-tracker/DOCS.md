# Home Assistant Health

Home Assistant Health runs as an ingress app on port `3000`. It is served
behind Home Assistant's ingress proxy, so there is no need to expose a port
on the host.

## How it works

The add-on identifies the signed-in user from the ingress headers Home
Assistant injects (`x-ha-user-id` and `x-ha-user-display-name`) and creates a
profile on first request. Writes are scoped to the signed-in user — a user
cannot delete or overwrite another household member's record unless they
own it.

## Routes

The server exposes these endpoints:

| Method | Path                | Purpose                                      |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/`                 | React app (Mantine UI)                       |
| GET    | `/api/bootstrap`    | Initial payload: household, members, entries |
| POST   | `/api/entries`      | Save a weight entry                          |
| DELETE | `/api/entries`     | Delete a weight entry by id                  |
| POST   | `/api/members`     | Add a household member                       |
| PATCH  | `/api/members`     | Patch a member profile                       |
| DELETE | `/api/members`     | Delete a member                              |
| GET    | `/api/export/csv`  | CSV export of the signed-in user's history   |
| GET    | `/api/health`      | JSON health probe                            |
| GET    | `/healthz`          | Alias for `/api/health`                      |
| GET    | `/api/ready`       | Plain-text readiness probe                   |
| GET    | `/readyz`           | Alias for `/api/ready`                       |

API request and response bodies are validated server-side and client-side
against shared Valibot schemas in [`src/lib/schemas.ts`](src/lib/schemas.ts).
Invalid payloads return HTTP 422 with a field name in the error message.

## Storage

The add-on mounts Home Assistant's `addon_config` directory with write access
(see `config.yaml`) and stores its SQLite database at `/config/health.db`. To
override the path, set `HEALTH_TRACKER_DB_PATH` in the add-on environment.

When `NODE_ENV` is not `production`, the database falls back to
`.data/health.db` relative to the working directory, which is how the
development server keeps a local file.

## Configuration

| Environment variable        | Default                | Effect                            |
| --------------------------- | ---------------------- | --------------------------------- |
| `HOST`                      | `0.0.0.0`              | Bind address                      |
| `PORT`                      | `3000`                 | Listen port                       |
| `NODE_ENV`                  | unset                  | `production` selects the prod DB path and rejects requests without ingress headers |
| `HEALTH_TRACKER_DB_PATH`    | derived (above)        | Absolute path to the SQLite file  |

When `NODE_ENV` is `production` and a request arrives without ingress headers,
the server returns 401. Outside production, missing headers fall back to a
synthetic development user, which makes local development possible without
faking the proxy.

## Local development

The repository uses [mise](https://mise.jdx.dev/) for tooling and task running.
From the repository root:

```bash
mise install         # install Bun and lint/format tools
mise run deps        # install app dependencies
mise run dev         # start the dev server with watch reload
mise run test        # run the Bun test suite
mise run lint        # Biome, Hadolint, and Markdown linting
mise run check       # everything above plus a production build
```

The dev server listens on `http://localhost:3000`. Without ingress headers it
signs you in as a synthetic development user (`dev-user-001`) so the UI is
usable without Home Assistant.

## Building the container locally

Build the production image with the same `BUILD_FROM` base Home Assistant uses:

```bash
docker build \
  --build-arg BUILD_ARCH=amd64 \
  --build-arg BUILD_VERSION=0.4.0 \
  -t homeassistant-health:test \
  health-tracker
```

Supported architectures (per `config.yaml`) are `amd64` and `aarch64`.

## Testing

`bun test` runs three suites:

*   `tests/tracker-store.test.ts` — direct calls into the SQLite-backed store.
*   `tests/api/*.test.ts` — HTTP integration tests against a server started
    on a random port with a tmpdir database.
*   `tests/components/*.test.tsx` — React component tests using happy-dom and
    React Testing Library.

A test preload at `tests/setup/dom.ts` registers happy-dom while preserving
Bun's native `fetch`/`Response`/`Request`/`Headers`, so component and HTTP
tests share one process without interfering.
