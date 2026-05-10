# Contributing

## Prerequisites

*   [mise](https://mise.jdx.dev/) installs the repo tools.
*   Bun is the JavaScript runtime and package manager.

## Setup

Install tools from `.mise.toml`:

```bash
mise install
```

Install app dependencies after `health-tracker/rootfs/app/package.json`
exists:

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

`mise run check` currently runs:

*   app `lint`, `test`, and `build` tasks when `health-tracker/rootfs/app/package.json` exists
*   `rumdl check .`
*   `hadolint` for Dockerfiles when Dockerfiles exist
*   `shellcheck` for shell scripts when shell scripts exist

The app scaffold does not exist yet, so app-scoped tasks print a skip
message.

## Tooling

`.mise.toml` pins these tool categories through mise:

*   Bun for JavaScript and TypeScript work
*   Biome for app linting and formatting
*   rumdl for Markdown
*   hadolint for Dockerfiles
*   shellcheck for shell scripts
*   actionlint and zizmor for GitHub Actions workflows
*   hk and pkl for Git hooks

`hk.pkl` defines hooks for pre-commit, pre-push, check, fix, and
commit-msg. The commit-msg hook checks Conventional Commit formatting.
