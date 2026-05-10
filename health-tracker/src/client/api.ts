import type * as v from "valibot";
import {
  BootstrapPayloadSchema,
  EntrySchema,
  MemberSchema,
  parseResponse,
} from "../lib/schemas";
import type { Entry, Member } from "../lib/types";
import { apiUrl } from "./api-url";
import { hasCompleteProfile } from "./lib/calc";
import { __store, applyBootstrap } from "./store";

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function request(
  path: string,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  const init: RequestInit = {
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  };
  if (options.method) init.method = options.method;
  if (options.body != null) init.body = JSON.stringify(options.body);
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return await response.json();
}

async function requestParsed<TSchema extends v.GenericSchema>(
  path: string,
  schema: TSchema,
  options: ApiRequestOptions = {},
): Promise<v.InferOutput<TSchema>> {
  const body = await request(path, options);
  return parseResponse(schema, body);
}

export type UpdateMemberOptions = {
  throwOnError?: boolean;
};

export const db = {
  async bootstrap() {
    const payload = await requestParsed(
      "/api/bootstrap",
      BootstrapPayloadSchema,
      {
        method: "GET",
        body: null,
      },
    );
    applyBootstrap(payload);
    return payload;
  },

  async listMembers(): Promise<Member[]> {
    return __store.state.members;
  },

  async getMember(id: string): Promise<Member | null> {
    return __store.state.members.find((m) => m.id === id) ?? null;
  },

  async listEntries(memberId: string): Promise<Entry[]> {
    return __store.state.entries.filter((e) => e.memberId === memberId);
  },

  async listAllEntries(): Promise<Entry[]> {
    return __store.state.entries;
  },

  async upsertEntry(entry: Entry): Promise<Entry> {
    const list = __store.state.entries;
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    __store.notify();
    requestParsed("/api/entries", EntrySchema, {
      method: "POST",
      body: entry,
    }).catch((error) => console.error("Failed to save entry", error));
    return entry;
  },

  async deleteEntry(id: string): Promise<void> {
    const list = __store.state.entries;
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) list.splice(idx, 1);
    __store.notify();
    request("/api/entries", { method: "DELETE", body: { id } }).catch((error) =>
      console.error("Failed to delete entry", error),
    );
  },

  async updateMember(
    id: string,
    patch: Partial<Member>,
    options: UpdateMemberOptions = {},
  ): Promise<Member | null> {
    const localMember = __store.state.members.find((x) => x.id === id) ?? null;
    if (localMember?.isMe && /^m\d+$/.test(id)) {
      await db.bootstrap();
      const currentMember = __store.state.members.find((x) => x.isMe) ?? null;
      if (currentMember?.id && currentMember.id !== id) {
        return db.updateMember(currentMember.id, patch, options);
      }
    }
    try {
      // PATCH returns 204 (no body); local state is updated optimistically
      // from the patch itself.
      await request("/api/members", {
        method: "PATCH",
        body: { id, patch },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Member not found" &&
        localMember?.isMe
      ) {
        await db.bootstrap();
        const currentMember = __store.state.members.find((x) => x.isMe) ?? null;
        if (currentMember?.id && currentMember.id !== id) {
          return db.updateMember(currentMember.id, patch, options);
        }
      }
      console.error("Failed to update member", error);
      if (options.throwOnError) throw error;
      return __store.state.members.find((x) => x.id === id) ?? null;
    }
    const m = __store.state.members.find((x) => x.id === id);
    if (m) {
      Object.assign(m, patch);
      m.profileComplete = hasCompleteProfile(m);
    }
    __store.notify();
    return m ?? null;
  },

  async addMember(profile: Partial<Member>): Promise<Member> {
    const id = `m_${Math.random().toString(36).slice(2, 9)}`;
    const member: Member = {
      id,
      displayName: "",
      initials: "",
      heightCm: null,
      age: null,
      sex: null,
      activityLevel: null,
      startWeightKg: null,
      goalWeightKg: null,
      targetDate: null,
      units: null,
      theme: "system",
      shareDetails: false,
      reminderTime: "08:00",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      isMe: false,
      tone: "sam",
      profileComplete: false,
      ...profile,
    };
    member.profileComplete = hasCompleteProfile(member);
    const saved = await requestParsed("/api/members", MemberSchema, {
      method: "POST",
      body: member,
    });
    __store.state.members.push(saved);
    __store.notify();
    return saved;
  },

  async removeMember(id: string): Promise<void> {
    __store.state.members = __store.state.members.filter((m) => m.id !== id);
    __store.state.entries = __store.state.entries.filter(
      (e) => e.memberId !== id,
    );
    __store.notify();
    request("/api/members", { method: "DELETE", body: { id } }).catch((error) =>
      console.error("Failed to remove member", error),
    );
  },
};
