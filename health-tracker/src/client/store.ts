import { useEffect, useState } from "react";
import type { Entry, Household, Member } from "../lib/types";

export type StoreState = {
  members: Member[];
  entries: Entry[];
  today: Date;
  household: Household | null;
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
    today: new Date(),
    household: null,
  },
  listeners: new Set(),
  notify(): void {
    for (const fn of this.listeners) fn();
  },
};

/**
 * Module-scope accessor for the current "today" instant.
 *
 * Used by pure utilities in src/client/lib/* that compute relative dates
 * outside of React's render path. Reads the same singleton state that
 * useStore subscribes to, so a bootstrap update flows everywhere on the
 * next render.
 */
export function getToday(): Date {
  return __store.state.today;
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
  __store.state.members = payload.members ?? [];
  __store.state.entries = payload.entries ?? [];
  if (payload.household) {
    __store.state.household = payload.household;
  }
  if (payload.today) {
    __store.state.today = new Date(payload.today);
  }
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
