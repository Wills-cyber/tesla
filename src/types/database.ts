/**
 * Hand-authored stand-in for Supabase's generated types.
 *
 * The shape matches `supabase/migrations/0001_initial_schema.sql`. Once the
 * project is linked, regenerate this file and delete the hand-written version:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > src/types/database.ts
 *
 * Nothing else in the app needs to change: every data-access module imports
 * `Database` from here and the clients in `src/lib/supabase` are generic over it.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountStatusEnum =
  | "pending_verification"
  | "active"
  | "suspended";

export type PlanStatusEnum = "coming_soon" | "open" | "closed" | "sold_out";

export type InvestmentStatusEnum =
  | "pending_activation"
  | "active"
  | "completed"
  | "cancelled";

export type InvestmentPaymentStatusEnum = "scheduled" | "paid" | "skipped";

export type TransactionTypeEnum =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "profit_payment"
  | "principal_return"
  | "referral_bonus"
  | "adjustment";

export type TransactionStatusEnum =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type NotificationCategoryEnum =
  | "account"
  | "investment"
  | "transaction"
  | "security"
  | "platform";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  referral_code: string | null;
  referred_by: string | null;
  account_status: AccountStatusEnum;
  created_at: string;
  updated_at: string;
};

type InvestmentPlanRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  vehicle_type: string;
  currency: string;
  investment_amount_cents: number;
  duration_days: number;
  stated_weekly_profit_cents: number;
  payment_periods: number;
  stated_total_profit_cents: number;
  principal_cents: number;
  completion_amount_cents: number;
  status: PlanStatusEnum;
  image_key: string;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type InvestmentRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: InvestmentStatusEnum;
  principal_cents: number;
  currency: string;
  paid_profit_cents: number;
  periods_paid: number;
  started_at: string | null;
  matures_at: string | null;
  created_at: string;
  updated_at: string;
};

type InvestmentPaymentRow = {
  id: string;
  investment_id: string;
  period_index: number;
  amount_cents: number;
  currency: string;
  status: InvestmentPaymentStatusEnum;
  due_at: string;
  paid_at: string | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  user_id: string;
  type: TransactionTypeEnum;
  status: TransactionStatusEnum;
  amount_cents: number;
  currency: string;
  reference: string;
  description: string | null;
  investment_id: string | null;
  metadata: Json | null;
  created_at: string;
  settled_at: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  category: NotificationCategoryEnum;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

type UserBalanceRow = {
  user_id: string;
  currency: string;
  available_cents: number;
  total_invested_cents: number;
  total_profit_cents: number;
  pending_withdrawal_cents: number;
  updated_at: string;
};

/**
 * Relationship metadata.
 *
 * `postgrest-js` requires a `Relationships` entry on every table — it is what
 * lets `.select("*, plan:investment_plans(*)")` be type-checked. The hand-written
 * types below declare the foreign keys the schema actually has, so embedded
 * selects resolve correctly; `supabase gen types` will produce the same shape.
 */
type Relationship<
  TName extends string,
  TColumns extends readonly string[],
  TReferencedRelation extends string,
  TReferencedColumns extends readonly string[],
  TIsOneToOne extends boolean = false,
> = {
  foreignKeyName: TName;
  columns: TColumns;
  isOneToOne: TIsOneToOne;
  referencedRelation: TReferencedRelation;
  referencedColumns: TReferencedColumns;
};

export type Database = {
  /**
   * Reported by the PostgREST instance. Regenerating this file will set the
   * real value; the version below matches Supabase's current default.
   */
  __InternalSupabase: {
    PostgrestVersion: "12.2.3";
  };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "email">;
        Update: Partial<ProfileRow>;
        Relationships: [
          Relationship<
            "profiles_id_fkey",
            ["id"],
            "users",
            ["id"],
            true
          >,
          Relationship<
            "profiles_referred_by_fkey",
            ["referred_by"],
            "profiles",
            ["id"]
          >,
        ];
      };
      investment_plans: {
        Row: InvestmentPlanRow;
        Insert: Partial<InvestmentPlanRow> &
          Pick<InvestmentPlanRow, "slug" | "name">;
        Update: Partial<InvestmentPlanRow>;
        Relationships: [];
      };
      investments: {
        Row: InvestmentRow;
        Insert: Partial<InvestmentRow> &
          Pick<InvestmentRow, "user_id" | "plan_id" | "principal_cents">;
        Update: Partial<InvestmentRow>;
        Relationships: [
          Relationship<"investments_user_id_fkey", ["user_id"], "profiles", ["id"]>,
          Relationship<
            "investments_plan_id_fkey",
            ["plan_id"],
            "investment_plans",
            ["id"]
          >,
        ];
      };
      investment_payments: {
        Row: InvestmentPaymentRow;
        Insert: Partial<InvestmentPaymentRow> &
          Pick<
            InvestmentPaymentRow,
            "investment_id" | "period_index" | "amount_cents" | "due_at"
          >;
        Update: Partial<InvestmentPaymentRow>;
        Relationships: [
          Relationship<
            "investment_payments_investment_id_fkey",
            ["investment_id"],
            "investments",
            ["id"]
          >,
        ];
      };
      transactions: {
        Row: TransactionRow;
        Insert: Partial<TransactionRow> &
          Pick<TransactionRow, "user_id" | "type" | "amount_cents">;
        Update: Partial<TransactionRow>;
        Relationships: [
          Relationship<"transactions_user_id_fkey", ["user_id"], "profiles", ["id"]>,
          Relationship<
            "transactions_investment_id_fkey",
            ["investment_id"],
            "investments",
            ["id"]
          >,
        ];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> &
          Pick<NotificationRow, "user_id" | "title" | "body">;
        Update: Partial<NotificationRow>;
        Relationships: [
          Relationship<
            "notifications_user_id_fkey",
            ["user_id"],
            "profiles",
            ["id"]
          >,
        ];
      };
      user_balances: {
        Row: UserBalanceRow;
        Insert: Partial<UserBalanceRow> & Pick<UserBalanceRow, "user_id">;
        Update: Partial<UserBalanceRow>;
        Relationships: [
          Relationship<
            "user_balances_user_id_fkey",
            ["user_id"],
            "profiles",
            ["id"],
            true
          >,
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      account_status: AccountStatusEnum;
      plan_status: PlanStatusEnum;
      investment_status: InvestmentStatusEnum;
      investment_payment_status: InvestmentPaymentStatusEnum;
      transaction_type: TransactionTypeEnum;
      transaction_status: TransactionStatusEnum;
      notification_category: NotificationCategoryEnum;
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
