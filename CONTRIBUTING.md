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
*   app test and build tasks
*   all lint tasks under `mise run lint`

## Tooling

`hk.pkl` defines hooks for pre-commit, pre-push, check, fix, and
commit-msg. The commit-msg hook checks Conventional Commit formatting.
