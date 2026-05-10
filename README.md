# homeassistant-health

A Home Assistant add-on repository. Currently ships one add-on:

*   **Home Assistant Health** — a family weight tracker. See
    [`health-tracker/`](health-tracker/).

## What the add-on does

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
*   Persists everything in a SQLite database under the add-on config mount.

## Repository layout

```text
repository.yaml           Home Assistant add-on repository metadata
health-tracker/           the add-on
  config.yaml             add-on metadata
  Dockerfile              add-on image build
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
    the add-on.
*   [`health-tracker/DOCS.md`](health-tracker/DOCS.md) — routes, storage,
    configuration, and local build notes.
