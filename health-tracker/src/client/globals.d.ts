declare module "*.css";

declare module "*.png" {
  const url: string;
  export default url;
}

interface Window {
  baseUrl?: string;
  /**
   * Legacy global app state; see src/client/store.ts. Phase 7 of the TS
   * migration removes the window assignment in favour of imports.
   */
  __app?: {
    state: {
      members: import("../lib/types").Member[];
      entries: import("../lib/types").Entry[];
    };
    listeners: Set<() => void>;
    notify: () => void;
  };
  /**
   * Mutable fixtures including `today`. Same migration plan as __app.
   */
  __fixtures?: {
    today: Date;
    household?: import("../lib/types").Household;
    [extra: string]: unknown;
  };
}
