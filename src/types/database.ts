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

export type AddressFormatEnum = "evm" | "tron";

export type DepositStatusEnum =
  | "awaiting_funds"
  | "pending"
  | "confirmed"
  | "credited"
  | "failed";

export type WithdrawalStatusEnum =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

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
  /** The specific vehicle model the plan references, e.g. `Tesla Model 3`. */
  vehicle_model: string;
  /** Broader market segment, used for grouping. Free-form text. */
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
  /** Public path to the plan's vehicle image, e.g. `/images/investments/…webp`. */
  image_url: string;
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
  total_deposited_cents: number;
  total_withdrawn_cents: number;
  updated_at: string;
};

/* ------------------------------------ wallet & crypto payments (migration 3) */

type PaymentAssetRow = {
  symbol: string;
  name: string;
  kind: string;
  decimals: number;
  display_decimals: number;
  created_at: string;
};

type PaymentNetworkRow = {
  id: string;
  name: string;
  protocol: string;
  address_format: AddressFormatEnum;
  explorer_tx_url_template: string | null;
  required_confirmations: number | null;
  created_at: string;
};

type PaymentMethodRow = {
  id: string;
  asset_symbol: string;
  network_id: string;
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  min_withdrawal_cents: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PlatformSettingRow = {
  key: string;
  value: Json;
  updated_at: string;
};

type DepositAddressRow = {
  id: string;
  user_id: string;
  method_id: string;
  address: string;
  memo: string | null;
  uri: string;
  expires_at: string | null;
  created_at: string;
};

type DepositRow = {
  id: string;
  user_id: string;
  method_id: string;
  /**
   * Postgres `numeric`. PostgREST serialises it as a JSON *number*, so this is
   * typed as both — pass it through `toDecimalString` at the mapping boundary
   * rather than assuming a string. See `src/lib/crypto/decimal.ts`.
   */
  asset_amount: string | number | null;
  credited_cents: number | null;
  status: DepositStatusEnum;
  tx_hash: string | null;
  confirmations: number | null;
  required_confirmations: number | null;
  transaction_id: string | null;
  created_at: string;
  settled_at: string | null;
};

type WithdrawalRequestRow = {
  id: string;
  user_id: string;
  method_id: string;
  destination_address: string;
  amount_cents: number;
  /**
   * Postgres `numeric`. PostgREST serialises it as a JSON *number*, so this is
   * typed as both — pass it through `toDecimalString` at the mapping boundary
   * rather than assuming a string. See `src/lib/crypto/decimal.ts`.
   */
  quoted_asset_amount: string | number | null;
  /**
   * Postgres `numeric`. PostgREST serialises it as a JSON *number*, so this is
   * typed as both — pass it through `toDecimalString` at the mapping boundary
   * rather than assuming a string. See `src/lib/crypto/decimal.ts`.
   */
  quoted_network_fee: string | number | null;
  /**
   * Postgres `numeric`. PostgREST serialises it as a JSON *number*, so this is
   * typed as both — pass it through `toDecimalString` at the mapping boundary
   * rather than assuming a string. See `src/lib/crypto/decimal.ts`.
   */
  quoted_usd_per_unit: string | number | null;
  quote_provider: string | null;
  quoted_at: string | null;
  /** Platform fee in USD cents. `0` when none is configured. */
  service_fee_cents: number;
  /** `amount_cents + service_fee_cents` — what leaves the USD ledger. */
  total_deducted_cents: number | null;
  status: WithdrawalStatusEnum;
  tx_hash: string | null;
  failure_reason: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
};

/**
 * An opt-in destination address book entry.
 *
 * The only client-writable table in the payments schema, and the least dangerous
 * one: an entry here cannot move money. `method_id` is stored alongside the
 * address so the network can never be dropped from a display, and a database
 * trigger freezes both columns after insert — re-pointing an entry would
 * silently redirect a destination the user believes they verified.
 */
type SavedWithdrawalAddressRow = {
  id: string;
  user_id: string;
  method_id: string;
  label: string;
  address: string;
  memo: string | null;
  created_at: string;
  last_used_at: string | null;
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
      payment_assets: {
        Row: PaymentAssetRow;
        Insert: Partial<PaymentAssetRow> &
          Pick<PaymentAssetRow, "symbol" | "name" | "decimals">;
        Update: Partial<PaymentAssetRow>;
        Relationships: [];
      };
      payment_networks: {
        Row: PaymentNetworkRow;
        Insert: Partial<PaymentNetworkRow> &
          Pick<
            PaymentNetworkRow,
            "id" | "name" | "protocol" | "address_format"
          >;
        Update: Partial<PaymentNetworkRow>;
        Relationships: [];
      };
      payment_methods: {
        Row: PaymentMethodRow;
        Insert: Partial<PaymentMethodRow> &
          Pick<PaymentMethodRow, "id" | "asset_symbol" | "network_id">;
        Update: Partial<PaymentMethodRow>;
        Relationships: [
          Relationship<
            "payment_methods_asset_symbol_fkey",
            ["asset_symbol"],
            "payment_assets",
            ["symbol"]
          >,
          Relationship<
            "payment_methods_network_id_fkey",
            ["network_id"],
            "payment_networks",
            ["id"]
          >,
        ];
      };
      platform_settings: {
        Row: PlatformSettingRow;
        Insert: Partial<PlatformSettingRow> &
          Pick<PlatformSettingRow, "key" | "value">;
        Update: Partial<PlatformSettingRow>;
        Relationships: [];
      };
      deposit_addresses: {
        Row: DepositAddressRow;
        Insert: Partial<DepositAddressRow> &
          Pick<DepositAddressRow, "user_id" | "method_id" | "address" | "uri">;
        Update: Partial<DepositAddressRow>;
        Relationships: [
          Relationship<
            "deposit_addresses_user_id_fkey",
            ["user_id"],
            "profiles",
            ["id"]
          >,
          Relationship<
            "deposit_addresses_method_id_fkey",
            ["method_id"],
            "payment_methods",
            ["id"]
          >,
        ];
      };
      deposits: {
        Row: DepositRow;
        Insert: Partial<DepositRow> & Pick<DepositRow, "user_id" | "method_id">;
        Update: Partial<DepositRow>;
        Relationships: [
          Relationship<"deposits_user_id_fkey", ["user_id"], "profiles", ["id"]>,
          Relationship<
            "deposits_method_id_fkey",
            ["method_id"],
            "payment_methods",
            ["id"]
          >,
        ];
      };
      withdrawal_requests: {
        Row: WithdrawalRequestRow;
        Insert: Partial<WithdrawalRequestRow> &
          Pick<
            WithdrawalRequestRow,
            "user_id" | "method_id" | "destination_address" | "amount_cents"
          >;
        Update: Partial<WithdrawalRequestRow>;
        Relationships: [
          Relationship<
            "withdrawal_requests_user_id_fkey",
            ["user_id"],
            "profiles",
            ["id"]
          >,
          Relationship<
            "withdrawal_requests_method_id_fkey",
            ["method_id"],
            "payment_methods",
            ["id"]
          >,
        ];
      };
      saved_withdrawal_addresses: {
        Row: SavedWithdrawalAddressRow;
        Insert: Partial<SavedWithdrawalAddressRow> &
          Pick<
            SavedWithdrawalAddressRow,
            "user_id" | "method_id" | "label" | "address"
          >;
        Update: Partial<SavedWithdrawalAddressRow>;
        Relationships: [
          Relationship<
            "saved_withdrawal_addresses_user_id_fkey",
            ["user_id"],
            "profiles",
            ["id"]
          >,
          Relationship<
            "saved_withdrawal_addresses_method_id_fkey",
            ["method_id"],
            "payment_methods",
            ["id"]
          >,
        ];
      };
    };
    Views: Record<never, never>;
    /**
     * `request_withdrawal` is the only write path for a withdrawal, and
     * `cancel_withdrawal` the only way to release one. Both perform every
     * server-side check (account status, enabled pair, address format, platform
     * minimum and maximum, service fee, spendable balance, ownership) inside the
     * database — see `supabase/migrations/0004_withdrawal_experience.sql`.
     */
    Functions: {
      request_withdrawal: {
        Args: {
          p_method_id: string;
          p_amount_cents: number;
          p_destination_address: string;
          p_quoted_asset_amount?: string | null;
          p_quoted_network_fee?: string | null;
          p_quote_provider?: string | null;
          p_quoted_at?: string | null;
          p_quoted_usd_per_unit?: string | null;
        };
        Returns: WithdrawalRequestRow;
      };
      cancel_withdrawal: {
        Args: { p_withdrawal_id: string };
        Returns: WithdrawalRequestRow;
      };
      /**
       * Activates a plan for `auth.uid()`.
       *
       * Takes only the plan id: the amount, duration, schedule and owner are all
       * derived server-side, so there is no argument through which a caller could
       * name its own terms. Returns one row — `setof` on the Postgres side, hence
       * the array.
       */
      activate_investment: {
        Args: { p_plan_id: string };
        Returns: { investment_id: string; reference: string }[];
      };
      /** Records a "Successful Login" notice for `auth.uid()`. */
      record_successful_login: {
        Args: { p_device?: string | null };
        Returns: undefined;
      };
      /**
       * Records a "Failed Login Attempt" notice for the account with this email.
       *
       * Returns nothing whether or not the email matched, so it cannot be used to
       * probe which addresses have accounts. Throttled to one per account per 15
       * minutes server-side.
       */
      record_failed_login: {
        Args: { p_email: string; p_device?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      account_status: AccountStatusEnum;
      plan_status: PlanStatusEnum;
      investment_status: InvestmentStatusEnum;
      investment_payment_status: InvestmentPaymentStatusEnum;
      transaction_type: TransactionTypeEnum;
      transaction_status: TransactionStatusEnum;
      notification_category: NotificationCategoryEnum;
      address_format: AddressFormatEnum;
      deposit_status: DepositStatusEnum;
      withdrawal_status: WithdrawalStatusEnum;
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
