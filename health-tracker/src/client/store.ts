import { useEffect, useState } from "react";
import type { Entry, Household, Member } from "../lib/types";

export type StoreState = {
  members: Member[];
  entries: Entry[];
};

export type Store = {
  state: StoreState;
  listeners: Set<() => void>;
  notify: () => void;
};

export const __store: Store = {
  state: {
    members: [],
    entries: [],
  },
  listeners: new Set(),
  notify(): void {
    for (const fn of this.listeners) fn();
  },
};

// Phase 7 of the TS migration removes the window assignment in favour of a
// direct import. Today's `db` client mutates state via window.__app, so the
// shape has to stay reachable globally until that lands.
if (typeof window !== "undefined") {
  window.__app = __store;
}

export type BootstrapPayload = {
  members?: Member[];
  entries?: Entry[];
  household?: Household;
  today?: string;
};

export function applyBootstrap(
  payload: BootstrapPayload | null | undefined,
): void {
  if (!payload) return;
  if (typeof window !== "undefined") {
    if (window.__fixtures && payload.household) {
      window.__fixtures.household = payload.household;
    }
    if (window.__fixtures && payload.today) {
      window.__fixtures.today = new Date(payload.today);
    }
  }
  __store.state.members = payload.members ?? [];
  __store.state.entries = payload.entries ?? [];
  __store.notify();
}

export function useStore(): StoreState {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    __store.listeners.add(fn);
    return () => {
      __store.listeners.delete(fn);
    };
  }, []);
  return __store.state;
}
