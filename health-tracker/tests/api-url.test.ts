import { expect, test } from "bun:test";
import { apiUrl } from "../src/client/api-url";

test("resolves API paths inside a Home Assistant ingress URL", () => {
  expect(
    apiUrl(
      "/api/bootstrap",
      "https://homeassistant.local/api/hassio_ingress/abc123/",
    ),
  ).toBe("https://homeassistant.local/api/hassio_ingress/abc123/api/bootstrap");
});

test("resolves API paths from nested Home Assistant ingress routes", () => {
  expect(
    apiUrl(
      "/api/members",
      "https://homeassistant.local/api/hassio_ingress/abc123/household",
    ),
  ).toBe("https://homeassistant.local/api/hassio_ingress/abc123/api/members");
});

test("resolves API paths when Home Assistant ingress omits a trailing slash", () => {
  expect(
    apiUrl(
      "/api/bootstrap",
      "https://homeassistant.local/api/hassio_ingress/abc123",
    ),
  ).toBe("https://homeassistant.local/api/hassio_ingress/abc123/api/bootstrap");
});

test("prefers an injected base URL when the host page supplies one", () => {
  expect(
    apiUrl(
      "/api/bootstrap",
      "https://homeassistant.local/lovelace/default",
      "/api/hassio_ingress/abc123",
    ),
  ).toBe("https://homeassistant.local/api/hassio_ingress/abc123/api/bootstrap");
});

test("resolves API paths at the local development root", () => {
  expect(apiUrl("/api/bootstrap", "http://127.0.0.1:3000/")).toBe(
    "http://127.0.0.1:3000/api/bootstrap",
  );
});

test("resolves non-ingress API paths from the app origin root", () => {
  expect(apiUrl("/api/bootstrap", "http://127.0.0.1:3000/profile")).toBe(
    "http://127.0.0.1:3000/api/bootstrap",
  );
});
