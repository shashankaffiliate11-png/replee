// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If you change the schema, regenerate with:
//   npx supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts

export type PlanCode = "free_trial" | "starter" | "professional";

export type NoticeStatus = "drafted" | "edited" | "finalized";

export type Profile = {
  id: string; // matches auth.users.id
  full_name: string | null;
  firm_name: string | null;
  ca_membership_no: string | null;
  phone: string | null;
  plan: PlanCode;
  created_at: string;
};

export type Notice = {
  id: string;
  user_id: string;
  client_name: string;
  notice_type: string;
  notice_reference_no: string | null;
  notice_section: string | null;
  notice_file_path: string | null;
  original_notice_text: string;
  ai_draft_response: string | null;
  final_response: string | null;
  status: NoticeStatus;
  created_at: string;
  updated_at: string;
};

export type UsageCounter = {
  user_id: string;
  period_month: string; // 'YYYY-MM-01'
  notices_used: number;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan: PlanCode;
  razorpay_subscription_id: string | null;
  status: "trialing" | "active" | "past_due" | "cancelled";
  current_period_end: string | null;
  created_at: string;
};

export type Database = {
  // Recent @supabase/supabase-js versions look for this marker (normally
  // added automatically by `supabase gen types typescript`) to resolve the
  // schema generic correctly against hand-written types like this file.
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      notices: {
        Row: Notice;
        Insert: Partial<Notice> & {
          user_id: string;
          client_name: string;
          notice_type: string;
          original_notice_text: string;
        };
        Update: Partial<Notice>;
        Relationships: [];
      };
      usage_counters: {
        Row: UsageCounter;
        Insert: Partial<UsageCounter> & { user_id: string; period_month: string };
        Update: Partial<UsageCounter>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { user_id: string; plan: PlanCode };
        Update: Partial<Subscription>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
