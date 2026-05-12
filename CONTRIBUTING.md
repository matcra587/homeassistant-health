# Contributing

## Prerequisites

*   [mise](https://mise.jdx.dev/) installs the repo tools.
*   Bun is the JavaScript runtime and package manager.

## Setup

Install tools from `.mise.toml`:

```bash
mise install
```

Install app dependencies:

```bash
mise run deps
```

Install Git hooks for this clone:

```bash
mise exec -- hk install --mise
```

## Current Tasks

List tasks:

```bash
mise tasks
```

Run the scaffold checks:

```bash
mise run check
```

`mise run check` runs:

*   TypeScript type checks
*   Python type and lint checks for the Home Assistant integration
*   app test and build tasks
*   all lint tasks under `mise run lint`

## Local Home Assistant Stack

Run a local Home Assistant container with the custom integration mounted:

```bash
mise run dev:ha-native
```

The stack starts Home Assistant on `http://localhost:8123`, the Health App on
`http://localhost:3000`, creates a local `dev` / `dev` Home Assistant login,
and seeds one shared Health profile. Stop it and remove its volumes with:

```bash
mise run dev:ha-native:down
```

## Python Integration Tooling

The custom Home Assistant integration uses the Python version pinned in
`custom_components/.python-version` and dependencies locked in
`custom_components/uv.lock`.

Update the Python lockfile after changing `custom_components/pyproject.toml`:

```bash
uv lock --project custom_components
```

Run the Python checks:

```bash
mise run lint:py
mise run typecheck:py
```

## Tooling

`hk.pkl` defines hooks for pre-commit, pre-push, check, fix, and
commit-msg. The commit-msg hook checks Conventional Commit formatting.
