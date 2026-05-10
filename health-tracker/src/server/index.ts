import { serve } from "bun";
import { getHealthStatus, getReadinessStatus } from "../lib/health";
import index from "./index.html";

const port = Number(Bun.env.PORT ?? "3000");
const hostname = Bun.env.HOST ?? "0.0.0.0";
const development = Bun.env.NODE_ENV !== "production";
const readyHeaders = { "content-type": "text/plain; charset=utf-8" };

function healthResponse(): Response {
  return Response.json(getHealthStatus());
}

function readyResponse(): Response {
  return new Response(`${getReadinessStatus()}\n`, { headers: readyHeaders });
}

const server = serve({
  hostname,
  port,
  development,
  routes: {
    "/": index,
    "/api/health": {
      GET: healthResponse,
    },
    "/healthz": {
      GET: healthResponse,
    },
    "/api/ready": {
      GET: readyResponse,
    },
    "/readyz": {
      GET: readyResponse,
    },
  },
});

console.log(`homeassistant-health listening on ${server.url}`);
