export type * from "./investment";
export type * from "./user";
export type * from "./transaction";
export type * from "./notification";
export type * from "./balance";
export type * from "./database";

/**
 * Result envelope returned by every data-access function.
 *
 * `unconfigured` is a first-class state, not an error: before Supabase is
 * linked there is genuinely no data source, and the UI must say so rather than
 * invent numbers.
 */
export type DataResult<T> =
  | { status: "ready"; data: T }
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export type ActionResult =
  | { status: "success"; message?: string; redirectTo?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  /** The feature exists in the UI but has no backend yet. */
  | { status: "unavailable"; message: string };
