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
  const [automatedNotices, setAutomatedNotices] = useState<any[]>([]);
  const [clients, setClients] = useState<{ id: string; legal_name: string }[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const periodMonth = `${new Date().toISOString().slice(0, 7)}-01`;

    async function load() {
      // 1. Fetch Supabase profile, usage, recent notices, and this firm's clients
      const [{ data: profileData }, { data: usageData }, { data: notices }, { data: clientRows }] = await Promise.all([
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
          .limit(10),
        supabase.from("clients").select("id, legal_name").eq("firm_id", user!.id).order("legal_name"),
      ]);

      setProfile(profileData);
      setUsage(usageData ?? { user_id: user!.id, period_month: periodMonth, notices_used: 0 });
      setRecent(
        (notices ?? [])
          .filter((n: any) => !(n.source === "gmail" && !n.client_id))
          .slice(0, 5)
      );
      setClients(clientRows ?? []);

      // 2. Fetch ingested automated notices from Express API
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const response = await fetch("/api/notices", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        const apiData = await response.json();
        if (apiData.success) {
          setAutomatedNotices(apiData.data);
        }
      } catch (error) {
        console.error("Error fetching automated notices:", error);
      }

      setLoading(false);
    }

    load();
  }, [user]);

  const plan = profile ? getPlan(profile.plan) : null;
  const used = usage?.notices_used ?? 0;
  const limit = plan?.noticesPerMonth ?? 3;
  const limitReached = limit !== "unlimited" && used >= limit;

  // Un-triaged inbox = Gmail-detected notices no one has assigned to a client yet
  const inbox = automatedNotices.filter((n) => !n.client_id);

  async function assignClient(noticeId: string, clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    setAssigningId(noticeId);
    const { error } = await supabase
      .from("notices")
      .update({ client_id: client.id, client_name: client.legal_name, status: "drafted" } as any)
      .eq("id", noticeId);

    if (error) {
      console.error("Failed to assign client:", error.message);
      setAssigningId(null);
      return;
    }

    const assigned = automatedNotices.find((n) => n.id === noticeId);
    setAutomatedNotices((prev) => prev.filter((n) => n.id !== noticeId));
    if (assigned) {
      setRecent((prev) =>
        [{ ...assigned, client_id: client.id, client_name: client.legal_name, status: "drafted" }, ...prev].slice(0, 5)
      );
    }
    setAssigningId(null);
  }

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

      {/* Structured Extracted Data Table Section */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-ink-950 mb-4">
          Automated Email Extraction & Processing
        </h2>

        {loading ? (
          <p className="text-sm text-ink-500">Loading extracted notices…</p>
        ) : automatedNotices.length === 0 ? (
          <div className="border border-dashed border-paper-line p-6 text-center bg-white">
            <p className="text-sm text-ink-600">No automated notices ingested yet. Incoming Gmail notices will populate here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-paper-line rounded-none bg-white">
            <table className="w-full text-left text-sm text-ink-950 border-collapse">
              <thead>
                <tr className="bg-paper-dim border-b border-paper-line font-medium text-xs uppercase text-ink-700">
                  <th className="p-3 border-r border-paper-line">Firm or Business Name</th>
                  <th className="p-3 border-r border-paper-line">GST Number</th>
                  <th className="p-3 border-r border-paper-line">PAN</th>
                  <th className="p-3 border-r border-paper-line">Signature Authority Person Name</th>
                  <th className="p-3 border-r border-paper-line">Notice Type</th>
                  <th className="p-3 text-center">Preview Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {automatedNotices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-yellow-50/50 transition-colors">
                    <td className="p-3 border-r border-paper-line font-medium">
                      {notice.firm_name || notice.client_name || "Unassigned"}
                    </td>
                    <td className="p-3 border-r border-paper-line font-mono text-xs">
                      {notice.gst_number || notice.extracted_gstin || "—"}
                    </td>
                    <td className="p-3 border-r border-paper-line font-mono text-xs">
                      {notice.pan_number || notice.extracted_pan || "—"}
                    </td>
                    <td className="p-3 border-r border-paper-line">
                      {notice.signatory_name || "—"}
                    </td>
                    <td className="p-3 border-r border-paper-line">
                      <span className="inline-block px-2 py-0.5 text-xs bg-brass/10 text-brass-dark border border-brass/20">
                        {notice.notice_type || "Tax Notice"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        to={`/app/preview/${notice.id}`}
                        className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-xs px-4 py-1.5 shadow-sm transition"
                      >
                        Preview
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inbox — Gmail-detected notices awaiting client assignment */}
      {inbox.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink-950 mb-3">
            Client Assignments Needed ({inbox.length})
          </h2>
          <div className="space-y-3">
            {inbox.map((notice) => (
              <div key={notice.id} className="border border-paper-line p-4 bg-white flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-950">
                    {notice.firm_name || notice.client_name} — {notice.notice_type}
                  </p>
                  <p className="text-xs text-ink-500">From: {notice.email_address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="input text-xs py-1.5 max-w-xs"
                    disabled={assigningId === notice.id}
                    defaultValue=""
                    onChange={(e) => e.target.value && assignClient(notice.id, e.target.value)}
                  >
                    <option value="" disabled>
                      {assigningId === notice.id ? "Assigning…" : "Select a client…"}
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legal_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Recent Drafts */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-950">Recent manual drafts</h2>
          <Link to="/app/history" className="text-sm text-ink-600 hover:text-ink-950">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-ink-500">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="mt-4 border border-dashed border-paper-line p-8 text-center bg-white">
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
                    {(notice as any).source === "gmail" ? " · via Gmail" : ""}
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