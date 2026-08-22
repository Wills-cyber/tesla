/**
 * Data-access layer.
 *
 * Every function returns a `DataResult`, never a bare value, so the four states
 * the UI has to handle are explicit at the type level:
 *
 *   ready          → render the data
 *   unconfigured   → Supabase isn't connected yet; render the empty state
 *   unauthenticated → no session; the route guard should have caught this
 *   error          → render the error state
 *
 * These modules are server-only. Client components receive already-resolved
 * props rather than importing from here.
 */
export {
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
  type QueryContext,
} from "./query-context";

export { getCurrentProfile, updateFullName } from "./profiles";
export {
  getInvestmentPlanBySlug,
  getInvestmentPlans,
} from "./investment-plans";
export {
  getActiveInvestment,
  getInvestmentPayments,
  getUserInvestments,
} from "./investments";
export { getUserTransactions, type TransactionQuery } from "./transactions";
export {
  getUnreadNotificationCount,
  getUserNotifications,
} from "./notifications";
export { getUserBalance } from "./balances";
export { resolveOrEmpty } from "./resolve";
