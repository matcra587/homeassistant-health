export type HealthStatus = {
  status: "ok";
  app: "homeassistant-health";
  runtime: "bun";
  bundler: "bun";
  storage: "sqlite";
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    app: "homeassistant-health",
    runtime: "bun",
    bundler: "bun",
    storage: "sqlite",
  };
}

export function getReadinessStatus(): "OK" {
  return "OK";
}
