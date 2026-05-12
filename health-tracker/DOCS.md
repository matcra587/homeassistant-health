# Home Assistant Health

Home Assistant Health runs as a Home Assistant App on port `3000`. Home
Assistant now uses **App** for what was previously called an add-on. It is
served behind Home Assistant's ingress proxy for the web UI, and it also
exposes a read-only local API for the companion Home Assistant integration.

## How it works

The App identifies the signed-in user from the ingress headers Home
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
| GET    | `/api/native/v1/entities` | Native integration entity payload     |
| GET    | `/healthz`          | Alias for `/api/health`                      |
| GET    | `/api/ready`       | Plain-text readiness probe                   |
| GET    | `/readyz`           | Alias for `/api/ready`                       |

API request and response bodies are validated server-side and client-side
against shared Valibot schemas in [`src/lib/schemas.ts`](src/lib/schemas.ts).
Invalid payloads return HTTP 422 with a field name in the error message.

## Native Home Assistant integration

The repository includes a custom integration at
[`../custom_components/homeassistant_health`](../custom_components/homeassistant_health).
Install that integration with HACS, then add **Home Assistant Health** from
Settings > Devices & Services. HACS installs only the custom integration; it
does not install the App. The integration creates real Home Assistant
`SensorEntity` and `BinarySensorEntity` entities from the App API; it does not
use MQTT discovery or write states directly through the REST API.

To add this repository to HACS manually:

```text
Repository: https://github.com/matcra587/homeassistant-health
Category: Integration
```

For advanced manual installs, copy
`custom_components/homeassistant_health` into Home Assistant as
`/config/custom_components/homeassistant_health`, then restart Home Assistant.

On Home Assistant OS installs, the App advertises Supervisor discovery for the
`homeassistant_health` integration. Discovery can prefill the App connection if
the custom integration is installed. Otherwise, add it manually and point it at
the App's internal URL.

For a local App installed from this repository, the default internal URL is:

```text
http://local-homeassistant-health:3000
```

Only profiles that are complete and have **Share details** enabled are included
in the native entity payload. In `0.5.0`, the baseline metrics are:

*   `current_weight` - sensor, kilograms, weight device class.
*   `logged_today` - binary sensor.
*   `streak_days` - sensor, days.
*   `goal_progress` - sensor, percentage.

The App configuration controls what is exposed:

| Option | Default | Effect |
| ------ | ------- | ------ |
| `native_integration.enabled` | `true` | Enables the read-only native API |
| `native_integration.token` | empty | Optional bearer token required by the integration |
| `native_integration.metrics` | all baseline metrics | Allow-list of native entities to expose |

Future advanced metrics should be added to this allow-list in patch releases,
so users can opt in before Home Assistant creates new entities.

The App also declares `3000/tcp` as an optional network port. Its default host
mapping is disabled, so users do not need to expose the App to use ingress or
the native integration. If a user chooses to map that port, it exposes the
Health App and API directly on the host.

### When new profiles appear in Home Assistant

A Home Assistant user and a Health profile are not the same thing. The App
creates a Health profile when a user opens the App through Home Assistant
ingress. A profile becomes native Home Assistant entities only after all of
these are true:

*   The profile is complete.
*   **Share details** is enabled for that profile.
*   The metric is enabled in `native_integration.metrics`.

The App API reflects eligible profiles immediately at
`/api/native/v1/entities`. The Home Assistant integration polls that endpoint
once per minute, so new entities normally appear in Home Assistant within
about 60 seconds. The integration adds new sensor and binary sensor entities
when a later poll returns a profile or metric that was not present during the
first setup.

If a profile does not appear, check the App API first. If the profile is missing
there, fix the Health profile or App options. If the profile is present in the
API but missing from Home Assistant after the next poll, reload the Home
Assistant Health integration from Settings > Devices & Services.

## Storage

The App mounts Home Assistant's `addon_config` directory with write access
(see `config.yaml`) and stores its SQLite database at `/config/health.db`. To
override the path, set `HEALTH_TRACKER_DB_PATH` in the App environment.

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
| `HEALTH_TRACKER_OPTIONS_PATH` | `/data/options.json` | Add-on options JSON path          |
| `HEALTH_TRACKER_NATIVE_TOKEN` | unset                | Overrides the native API bearer token |

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

### Local Home Assistant native integration stack

To test the custom integration against a real Home Assistant container:

```bash
mise run dev:ha-native
```

This starts Home Assistant on `http://localhost:8123`, the health tracker App on
`http://localhost:3000`, mounts `custom_components/homeassistant_health`, seeds
one shared profile, and preconfigures a Home Assistant config entry for the
native integration. Log in to Home Assistant with username `dev` and password
`dev`. Stop and remove the stack with:

```bash
mise run dev:ha-native:down
```

The direct App URL, `http://localhost:3000`, does not run through Home
Assistant ingress. In that mode the server uses the synthetic development user
`dev-user-001`. Use it for quick UI and entity-export checks, but do not use it
to verify per-Home Assistant-user ingress behavior. A profile created there can
still appear in Home Assistant if the profile is complete and **Share details**
is enabled.

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
*   `tests/native-integration*.test.ts` — native entity payload and option
    allow-list tests.
*   `tests/api/*.test.ts` — HTTP integration tests against a server started
    on a random port with a tmpdir database.
*   `tests/components/*.test.tsx` — React component tests using happy-dom and
    React Testing Library.

A test preload at `tests/setup/dom.ts` registers happy-dom while preserving
Bun's native `fetch`/`Response`/`Request`/`Headers`, so component and HTTP
tests share one process without interfering.
