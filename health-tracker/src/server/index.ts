import { serve } from "bun";
import { getHealthStatus, getReadinessStatus } from "../lib/health";
import {
  EntryDeleteSchema,
  EntrySchema,
  MemberDeleteSchema,
  MemberPatchRequestSchema,
  MemberSchema,
  parseBody,
} from "../lib/schemas";
import type { Member } from "../lib/types";
import index from "./index.html";
import {
  bootstrap,
  csvExport,
  deleteEntry,
  deleteMember,
  saveEntry,
  saveMember,
  updateMember,
} from "./tracker-store";

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

export type ServerOptions = {
  port?: number;
  hostname?: string;
  /** When true, requests without Home Assistant ingress headers get 401. When
   * false, they fall through to a synthetic dev user (handy for local dev and
   * tests). Defaults to `NODE_ENV === "production"` so prod stays locked down
   * without explicit opt-in. */
  requireIngress?: boolean;
};

export function createServer(options: ServerOptions = {}) {
  const requireIngress =
    options.requireIngress ?? Bun.env.NODE_ENV === "production";
  return serve({
    hostname: options.hostname ?? Bun.env.HOST ?? "0.0.0.0",
    port: options.port ?? Number(Bun.env.PORT ?? "3000"),
    development: Bun.env.NODE_ENV !== "production",
    routes: {
      "/": index,
      "/api/bootstrap": {
        GET: route((request) =>
          Response.json(bootstrap(request.headers, requireIngress)),
        ),
      },
      "/api/entries": {
        POST: route(async (request) =>
          Response.json(
            saveEntry(
              request.headers,
              parseBody(EntrySchema, await readJson(request)),
              requireIngress,
            ),
          ),
        ),
        DELETE: route(async (request) => {
          const { id } = parseBody(EntryDeleteSchema, await readJson(request));
          deleteEntry(request.headers, id, requireIngress);
          return noContent();
        }),
      },
      "/api/export/csv": {
        GET: route(
          (request) =>
            new Response(csvExport(request.headers, requireIngress), {
              headers: csvHeaders,
            }),
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
              requireIngress,
            ),
          ),
        ),
        PATCH: route(async (request) => {
          const { id, patch } = parseBody(
            MemberPatchRequestSchema,
            await readJson(request),
          );
          // Schema infers `{ id?: string | undefined }`; Partial<Member> with
          // exactOptionalPropertyTypes wants `{ id?: string }`. Structurally
          // identical at runtime — cast at the boundary instead of widening
          // the upstream type.
          updateMember(
            request.headers,
            id,
            patch as Partial<Member>,
            requireIngress,
          );
          return noContent();
        }),
        DELETE: route(async (request) => {
          const { id } = parseBody(MemberDeleteSchema, await readJson(request));
          deleteMember(request.headers, id, requireIngress);
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
}

if (import.meta.main) {
  const server = createServer();
  console.log(`homeassistant-health listening on ${server.url}`);
}
