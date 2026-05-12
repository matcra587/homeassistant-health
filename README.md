# homeassistant-health

A Home Assistant App repository. Home Assistant now uses **App** for what was
previously called an add-on. This repo currently ships one App and one custom
integration:

*   **Home Assistant Health** — a family weight tracker. See
    [`health-tracker/`](health-tracker/).
*   **Home Assistant Health integration** — a native Home Assistant integration
    that creates sensor and binary sensor entities from the App's read-only
    API. See [`custom_components/homeassistant_health/`](custom_components/homeassistant_health/).

## Installation

Install the App from this Home Assistant repository, then install the companion
custom integration with HACS.

HACS installs only the custom integration. It does not install the App itself.

[![Open your Home Assistant instance and open this repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=matcra587&repository=homeassistant-health&category=integration)

If the button is not available, add this repository to HACS manually:

```text
Repository: https://github.com/matcra587/homeassistant-health
Category: Integration
```

After HACS installs the integration, restart Home Assistant and add **Home
Assistant Health** from Settings > Devices & Services.

## What the App Does

*   Runs as a Home Assistant ingress app on port `3000`.
*   Detects the signed-in Home Assistant user from ingress headers and creates
    a profile on first sign-in.
*   Tracks per-member profile fields: height, age, sex, activity level,
    starting weight, goal weight, and target date.
*   Logs daily weight entries with optional body fat percentage, waist
    measurement, and notes, and supports back-dating entries.
*   Calculates BMI, BMR, TDEE, estimated body fat, ideal weight, recent trend,
    progress to goal, pacing, and current streak.
*   Shows a weight chart with goal marker and a time-range selector (1M, 3M,
    6M, 1Y, all).
*   Lists entries with edit and delete actions.
*   Provides a household view with a per-member privacy toggle for
    exact-weight sharing.
*   Surfaces a milestone notification when a member reaches their goal weight.
*   Saves per-member theme, units (metric, imperial, UK stone), reminder time,
    milestone alerts toggle, and reset grace period.
*   Exports the signed-in user's history as CSV.
*   Exposes selected shared metrics as native Home Assistant entities via the
    companion custom integration.
*   Persists everything in a SQLite database under the App config mount.

## Repository layout

```text
repository.yaml           Home Assistant App repository metadata
custom_components/        Home Assistant custom integration
hacs.json                 HACS metadata for the custom integration
health-tracker/           the Home Assistant App/add-on
  config.yaml             App metadata
  Dockerfile              App image build
  run.sh                  container start script
  README.md               store intro
  DOCS.md                 routes, storage, local build notes
  CHANGELOG.md            release notes
  src/client/             React UI (Mantine v9)
  src/server/             Bun fullstack server and API
  src/lib/                shared types and Valibot schemas
  tests/                  Bun test suite
```

## Documentation

*   [`health-tracker/README.md`](health-tracker/README.md) — store intro for
    the App.
*   [`health-tracker/DOCS.md`](health-tracker/DOCS.md) — routes, storage,
    configuration, and local build notes.

## Local HA Stack

Use `mise run dev:ha-native` to start Home Assistant on
`http://localhost:8123` with the custom integration mounted and preconfigured.
Log in with username `dev` and password `dev`. Use
`mise run dev:ha-native:down` to stop it and remove the local volumes.

The stack also exposes the App directly on `http://localhost:3000`. That direct
URL uses the synthetic development user `dev-user-001`; it is useful for quick
UI checks, but it is not a real Home Assistant ingress session.
