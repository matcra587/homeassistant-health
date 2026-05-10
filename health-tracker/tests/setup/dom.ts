/**
 * Test preload — registers happy-dom's window/document for component tests
 * while preserving Bun's native network primitives so the HTTP integration
 * tests in tests/api/ continue to work.
 *
 * happy-dom's `fetch` enforces same-origin policy and rejects requests to
 * `127.0.0.1`, and its `Response` is a different constructor than Bun's so
 * `instanceof Response` checks across the boundary fail. Capturing Bun's
 * globals before registration and reinstating them after lets both worlds
 * share one preload.
 *
 * NODE_ENV is intentionally left unset (development) so React 19 exposes
 * `act` to @testing-library/react and Bun's JSX transform stays in dev
 * mode. The API server uses `Bun.serve({ development: true })` as a
 * result, which is harmless for in-process tests.
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";

const bunFetch = globalThis.fetch;
const bunResponse = globalThis.Response;
const bunRequest = globalThis.Request;
const bunHeaders = globalThis.Headers;

GlobalRegistrator.register();

globalThis.fetch = bunFetch;
globalThis.Response = bunResponse;
globalThis.Request = bunRequest;
globalThis.Headers = bunHeaders;
