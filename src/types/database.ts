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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "email">;
        Update: Partial<ProfileRow>;
      };
      investment_plans: {
        Row: InvestmentPlanRow;
        Insert: Partial<InvestmentPlanRow> &
          Pick<InvestmentPlanRow, "slug" | "name">;
        Update: Partial<InvestmentPlanRow>;
      };
      investments: {
        Row: InvestmentRow;
        Insert: Partial<InvestmentRow> &
          Pick<InvestmentRow, "user_id" | "plan_id" | "principal_cents">;
        Update: Partial<InvestmentRow>;
      };
      investment_payments: {
        Row: InvestmentPaymentRow;
        Insert: Partial<InvestmentPaymentRow> &
          Pick<
            InvestmentPaymentRow,
            "investment_id" | "period_index" | "amount_cents" | "due_at"
          >;
        Update: Partial<InvestmentPaymentRow>;
      };
      transactions: {
        Row: TransactionRow;
        Insert: Partial<TransactionRow> &
          Pick<TransactionRow, "user_id" | "type" | "amount_cents">;
        Update: Partial<TransactionRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> &
          Pick<NotificationRow, "user_id" | "title" | "body">;
        Update: Partial<NotificationRow>;
      };
      user_balances: {
        Row: UserBalanceRow;
        Insert: Partial<UserBalanceRow> & Pick<UserBalanceRow, "user_id">;
        Update: Partial<UserBalanceRow>;
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
