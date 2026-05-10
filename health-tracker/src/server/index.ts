import { serve } from "bun";
import { getHealthStatus, getReadinessStatus } from "../lib/health";
import index from "./index.html";
import {
  EntryDeleteSchema,
  EntrySchema,
  MemberDeleteSchema,
  MemberPatchRequestSchema,
  MemberSchema,
  parseBody,
} from "./schemas";
import {
  bootstrap,
  csvExport,
  deleteEntry,
  deleteMember,
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

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Response("Request body is not valid JSON", { status: 400 });
  }
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
          saveEntry(
            request.headers,
            parseBody(EntrySchema, await readJson(request)),
          ),
        ),
      ),
      DELETE: route(async (request) => {
        const { id } = parseBody(EntryDeleteSchema, await readJson(request));
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
          saveMember(
            request.headers,
            parseBody(MemberSchema, await readJson(request)),
          ),
        ),
      ),
      PATCH: route(async (request) => {
        const { id, patch } = parseBody(
          MemberPatchRequestSchema,
          await readJson(request),
        );
        updateMember(request.headers, id, patch);
        return noContent();
      }),
      DELETE: route(async (request) => {
        const { id } = parseBody(MemberDeleteSchema, await readJson(request));
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
