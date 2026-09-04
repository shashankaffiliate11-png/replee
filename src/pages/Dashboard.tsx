import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getPlan } from "../lib/plans";
import type { Notice, Profile, UsageCounter } from "../lib/database.types";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageCounter | null>(null);
  const [recent, setRecent] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const periodMonth = `${new Date().toISOString().slice(0, 7)}-01`;

    async function load() {
      const [{ data: profileData }, { data: usageData }, { data: notices }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase
          .from("usage_counters")
          .select("*")
          .eq("user_id", user!.id)
          .eq("period_month", periodMonth)
          .maybeSingle(),
        supabase
          .from("notices")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setProfile(profileData);
      setUsage(usageData ?? { user_id: user!.id, period_month: periodMonth, notices_used: 0 });
      setRecent(notices ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  const plan = profile ? getPlan(profile.plan) : null;
  const used = usage?.notices_used ?? 0;
  const limit = plan?.noticesPerMonth ?? 3;
  const limitReached = limit !== "unlimited" && used >= limit;

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome"}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {profile?.firm_name && profile.firm_name !== "Independent Practice"
              ? profile.firm_name
              : "Independent practice"}
          </p>
        </div>
        <Link
          to="/app/new"
          className={`btn-primary ${limitReached ? "pointer-events-none opacity-40" : ""}`}
        >
          + Draft New Response
        </Link>
      </div>

      {/* Usage card */}
      {!loading && plan && (
        <div className="mt-8 border border-paper-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="border border-brass/40 bg-brass/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-brass-dark">
                {plan.name}
              </span>
              <span className="text-sm text-ink-600">
                {used} of {limit === "unlimited" ? "unlimited" : limit} drafts used this month
              </span>
            </div>
            {plan.code !== "professional" && (
              <Link to="/pricing" className="text-sm font-medium text-brass-dark hover:text-brass-light">
                Upgrade plan →
              </Link>
            )}
          </div>
          {limit !== "unlimited" && (
            <div className="mt-3 h-1.5 w-full bg-paper-dim">
              <div
                className="h-1.5 bg-brass"
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
          )}
          {limitReached && (
            <p className="mt-3 text-sm text-warn">
              You've used all drafts on your plan this month.{" "}
              <Link to="/pricing" className="underline">
                Upgrade to keep drafting
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {/* Recent notices */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-950">Recent drafts</h2>
          <Link to="/app/history" className="text-sm text-ink-600 hover:text-ink-950">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-ink-500">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="mt-4 border border-dashed border-paper-line p-8 text-center">
            <p className="text-sm text-ink-600">No drafts yet.</p>
            <Link to="/app/new" className="mt-2 inline-block text-sm text-brass-dark underline">
              Draft your first response
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-paper-line border border-paper-line bg-white">
            {recent.map((notice) => (
              <Link
                key={notice.id}
                to={`/app/notices/${notice.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-paper-dim"
              >
                <div>
                  <p className="text-sm font-medium text-ink-950">{notice.client_name}</p>
                  <p className="text-xs text-ink-500">
                    {notice.notice_type}
                    {notice.notice_reference_no ? ` · ${notice.notice_reference_no}` : ""}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-ink-400">{notice.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
