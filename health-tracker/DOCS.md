# Home Assistant Health Documentation

Home Assistant Health runs as an ingress app on port `3000`.

The current browser interface is a hello-world placeholder.

## Routes

The app serves:

*   `/` for the browser interface
*   `/api/health` for the JSON health contract
*   `/healthz` as an alias for `/api/health`
*   `/api/ready` for the plain text readiness probe
*   `/readyz` as an alias for `/api/ready`

## Storage

The app maps the Home Assistant `addon_config` directory with write access.
The container also has the standard writable `/data` directory for persistent
runtime data.

## Local Checks

Run the local verification stack from the repository root:

```bash
mise run check
```

Build the local Docker image:

```bash
docker build --build-arg BUILD_ARCH=amd64 --build-arg BUILD_VERSION=0.1.0 -t homeassistant-health:test health-tracker
```
