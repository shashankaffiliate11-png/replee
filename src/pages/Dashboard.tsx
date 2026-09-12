import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  Sparkles,
  Mail,
  Pencil,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getPlan } from "../lib/plans";
import type { Profile, UsageCounter } from "../lib/database.types";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins <= 0 ? 1 : mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageCounter | null>(null);
  const [automatedNotices, setAutomatedNotices] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pending: 0, edited: 0, finalized: 0 });
  // Maps a notice's id to its 1-based chronological rank among ALL
  // responses (manual + auto-generated combined) created this billing
  // period, oldest first. Used to decide whether a given row's Preview is
  // still within the plan's combined limit.
  const [combinedRankById, setCombinedRankById] = useState<Record<string, number>>({});

  // Search & Selected Client State
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const periodMonth = `${new Date().toISOString().slice(0, 7)}-01`;

    async function load() {
      try {
        const [
          { data: profileData },
          { data: usageData },
          { data: clientRows },
          { count: pendingCount },
          { count: editedCount },
          { count: finalizedCount },
          { data: combinedPeriodRows },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
          supabase
            .from("usage_counters")
            .select("*")
            .eq("user_id", user!.id)
            .eq("period_month", periodMonth)
            .maybeSingle(),
          supabase.from("clients").select("*").eq("firm_id", user!.id).order("legal_name"),
          // Pending Notices — total count of notices that have landed via
          // the connected email inbox, regardless of current status.
          (supabase.from("notices") as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("source", "gmail"),
          // Edited — notices currently in 'edited' status, which is set
          // the moment "Save edits" is clicked in NoticeDetail.
          supabase
            .from("notices")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("status", "edited"),
          // Finalized — notices currently in 'finalized' status, set when
          // "Mark as finalized" is clicked in NoticeDetail.
          supabase
            .from("notices")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("status", "finalized"),
          // Every response (manual + auto-generated, any status) created
          // this billing period, oldest first — this is what "combined
          // manual plus auto generations" gets counted against for the
          // Free/Starter Preview-vs-Upgrade cutoff below.
          supabase
            .from("notices")
            .select("id, created_at")
            .eq("user_id", user!.id)
            .gte("created_at", periodMonth)
            .order("created_at", { ascending: true }),
        ]);

        setProfile(profileData);
        setUsage(usageData ?? { user_id: user!.id, period_month: periodMonth, notices_used: 0 });
        setClients(clientRows ?? []);
        setCounts({
          pending: pendingCount ?? 0,
          edited: editedCount ?? 0,
          finalized: finalizedCount ?? 0,
        });

        const rankById: Record<string, number> = {};
        (combinedPeriodRows ?? []).forEach((row: { id: string }, idx: number) => {
          rankById[row.id] = idx + 1; // 1-based, oldest first
        });
        setCombinedRankById(rankById);

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        // No ?source= filter — this table shows manually drafted notices
        // alongside Gmail-ingested ones, newest first.
        const response = await fetch("/api/notices", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            setAutomatedNotices(apiData.data || []);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const handleSelectClient = (client: any) => {
    navigate(`/app/clients/${client.id}`);
  };

  const plan = profile ? getPlan(profile.plan) : null;
  const used = usage?.notices_used ?? 0;
  const bonusDrafts = (profile as any)?.bonus_drafts ?? 0;
  const limit =
    plan?.noticesPerMonth === "unlimited"
      ? "unlimited"
      : (plan?.noticesPerMonth ?? 3) + bonusDrafts;
  const limitReached = limit !== "unlimited" && used >= limit;

  // Whether THIS specific row's Preview should still work, based on its
  // rank among all manual+auto responses created this period. Unlimited
  // plans always preview; Free/Starter only preview up to their combined
  // limit (oldest first), then show Upgrade Plan instead.
  function canPreviewRow(noticeId: string): boolean {
    if (limit === "unlimited") return true;
    const rank = combinedRankById[noticeId];
    if (!rank) return true; // rank not resolved yet (still loading) — don't block
    return rank <= (limit as number);
  }

  const filteredClients = clients.filter((c) =>
    c.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.pan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClients = clients.length;

  const statCards = [
    {
      label: "Pending Notices",
      value: loading ? "—" : String(counts.pending),
      sublabel: "Total notices received via connected email",
      icon: Mail,
      tint: "bg-accent-blue-tint text-accent-blue",
    },
    {
      label: "Edited",
      value: loading ? "—" : String(counts.edited),
      sublabel: "Drafts with saved edits, awaiting finalization",
      icon: Pencil,
      tint: "bg-accent-green-tint text-accent-green",
    },
    {
      label: "Finalized",
      value: loading ? "—" : String(counts.finalized),
      sublabel: "Responses marked finalized",
      icon: CheckCircle2,
      tint: "bg-accent-purple-tint text-accent-purple",
    },
    {
      label: "Success Rate",
      value: "—",
      sublabel: "Not tracked yet",
      icon: ShieldCheck,
      tint: "bg-brass-tint text-brass-dark",
    },
  ];

  function statusPill(status?: string) {
    const s = (status || "").toLowerCase();
    if (s === "drafted" || s === "edited") return { label: "Ready", cls: "bg-accent-green-tint text-accent-green" };
    if (s === "finalized") return { label: "Finalized", cls: "bg-accent-blue-tint text-accent-blue" };
    if (s === "pending_ca_review") return { label: "Needs Review", cls: "bg-brass-tint text-brass-dark" };
    return { label: status || "—", cls: "bg-paper-dim text-ink-500" };
  }

  return (
    <AppShell>
      <div>
        {/* MAIN COLUMN */}
        <div>
          <div className="grid grid-cols-1 gap-4">
            <div className="relative w-1/2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by Legal Name, GSTIN, or PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-lg border border-paper-line bg-white px-4 py-2.5 text-sm text-ink-950 placeholder-ink-400 focus:border-brass focus:outline-none"
                />
                <button className="btn-primary whitespace-nowrap">Search</button>
              </div>

              {searchQuery && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-paper-line bg-white shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-xs text-ink-500">No matching client found.</p>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left p-3 hover:bg-brass-tint border-b border-paper-line last:border-0 transition"
                      >
                        <p className="text-sm font-semibold text-ink-950">{client.legal_name}</p>
                        <p className="text-xs text-ink-500">
                          GSTIN: <span className="font-mono">{client.gstin || "N/A"}</span> · PAN:{" "}
                          <span className="font-mono">{client.pan || "N/A"}</span>
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border border-paper-line bg-white p-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.tint}`}>
                    <Icon size={14} />
                  </div>
                  <p className="mt-1.5 text-lg font-semibold text-ink-950">{s.value}</p>
                  <p className="text-xs font-medium text-ink-700">{s.label}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-ink-400">{s.sublabel}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-paper-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass-tint text-brass-dark">
                  <Sparkles size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-ink-950">Your Notice Inbox</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!loading && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-green-tint px-2.5 py-1 text-xs font-medium text-accent-green">
                    <CheckCircle2 size={13} /> {totalClients} Client{totalClients === 1 ? "" : "s"} Onboarded
                  </span>
                )}
                {automatedNotices.length > 0 && (
                  <Link to="/app/history" className="text-xs font-medium text-brass-dark hover:underline whitespace-nowrap">
                    View All →
                  </Link>
                )}
              </div>
            </div>

            {loading ? (
              <p className="mt-5 text-sm text-ink-500">Checking for incoming email notices…</p>
            ) : automatedNotices.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-paper-line p-6 text-center">
                <p className="text-sm text-ink-600">
                  No notices detected yet for <strong>{user?.email}</strong>.
                </p>
                <p className="text-xs text-ink-400 mt-1">
                  When a tax notice email arrives at this inbox, extracted details will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-paper-line">
                <table className="w-full text-left text-sm text-ink-950 border-collapse">
                  <thead>
                    <tr className="bg-paper-dim border-b border-paper-line font-medium text-xs uppercase text-ink-500">
                      <th className="p-3">Firm or Business Name</th>
                      <th className="p-3">GST Number</th>
                      <th className="p-3">PAN</th>
                      <th className="p-3">Signature Authority Person Name</th>
                      <th className="p-3">Notice Type</th>
                      <th className="p-3">Preview Response</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-line">
                    {automatedNotices.map((notice) => {
                      const pill = statusPill(notice.status);
                      return (
                        <tr key={notice.id} className="hover:bg-paper-dim/60 transition-colors">
                          <td className="p-3 font-medium">{notice.firm_name || notice.client_name || "—"}</td>
                          <td className="p-3 font-mono text-xs">{notice.gst_number || notice.extracted_gstin || "—"}</td>
                          <td className="p-3 font-mono text-xs">{notice.pan_number || notice.extracted_pan || "—"}</td>
                          <td className="p-3">{notice.signatory_name || "—"}</td>
                          <td className="p-3">
                            <span className="inline-block rounded px-2 py-0.5 text-xs bg-brass-tint text-brass-dark border border-brass/20">
                              {notice.notice_type || "Tax Notice"}
                            </span>
                          </td>
                          <td className="p-3">
                            {canPreviewRow(notice.id) ? (
                              <Link
                                to={`/app/notices/${notice.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-paper-dim"
                              >
                                <Eye size={13} /> Preview
                              </Link>
                            ) : (
                              <Link
                                to="/pricing"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-white hover:bg-brass-dark"
                              >
                                Upgrade Plan
                              </Link>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${pill.cls}`}>
                              {pill.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
