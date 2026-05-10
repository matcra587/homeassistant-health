import { serve } from "bun";
import { getHealthStatus, getReadinessStatus } from "../lib/health";
import index from "./index.html";
import {
  bootstrap,
  csvExport,
  deleteEntry,
  deleteMember,
  type Entry,
  type Member,
  saveEntry,
  saveMember,
  updateMember,
} from "./tracker-store";

const port = Number(Bun.env.PORT ?? "3000");
const hostname = Bun.env.HOST ?? "0.0.0.0";
const development = Bun.env.NODE_ENV !== "production";
const readyHeaders = { "content-type": "text/plain; charset=utf-8" };
const csvHeaders = {
  "content-disposition": 'attachment; filename="homeassistant-health.csv"',
  "content-type": "text/csv; charset=utf-8",
};

function healthResponse(): Response {
  return Response.json(getHealthStatus());
}

function readyResponse(): Response {
  return new Response(`${getReadinessStatus()}\n`, { headers: readyHeaders });
}

async function readJson<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function errorResponse(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }

  console.error(error);
  return new Response("Internal Server Error", { status: 500 });
}

function route(handler: (request: Request) => Response | Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

const server = serve({
  hostname,
  port,
  development,
  routes: {
    "/": index,
    "/api/bootstrap": {
      GET: route((request) => Response.json(bootstrap(request.headers))),
    },
    "/api/entries": {
      POST: route(async (request) =>
        Response.json(
          saveEntry(request.headers, await readJson<Entry>(request)),
        ),
      ),
      DELETE: route(async (request) => {
        const { id } = await readJson<{ id?: string }>(request);
        if (!id) {
          return new Response("Entry id is required", { status: 400 });
        }
        deleteEntry(request.headers, id);
        return noContent();
      }),
    },
    "/api/export/csv": {
      GET: route(
        (request) =>
          new Response(csvExport(request.headers), { headers: csvHeaders }),
      ),
    },
    "/api/health": {
      GET: healthResponse,
    },
    "/api/members": {
      POST: route(async (request) =>
        Response.json(
          saveMember(request.headers, await readJson<Member>(request)),
        ),
      ),
      PATCH: route(async (request) => {
        const { id, patch } = await readJson<{
          id?: string;
          patch?: Partial<Member>;
        }>(request);
        if (!id) {
          return new Response("Member id is required", { status: 400 });
        }
        updateMember(request.headers, id, patch ?? {});
        return noContent();
      }),
      DELETE: route(async (request) => {
        const { id } = await readJson<{ id?: string }>(request);
        if (!id) {
          return new Response("Member id is required", { status: 400 });
        }
        deleteMember(request.headers, id);
        return noContent();
      }),
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
