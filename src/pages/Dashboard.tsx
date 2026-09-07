import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getPlan } from "../lib/plans";
import type { Notice, Profile, UsageCounter } from "../lib/database.types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageCounter | null>(null);
  const [manualDrafts, setManualDrafts] = useState<Notice[]>([]);
  const [automatedNotices, setAutomatedNotices] = useState<any[]>([]);
  
  // Search & Selected Client State
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientNotices, setClientNotices] = useState<Notice[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const periodMonth = `${new Date().toISOString().slice(0, 7)}-01`;

    async function load() {
      try {
        // 1. Fetch Profile, Usage, Clients, and MANUAL Drafts strictly
        const [{ data: profileData }, { data: usageData }, { data: manualRows }, { data: clientRows }] = await Promise.all([
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
            .neq("source" as any, "gmail") // Strictly manual history
            .order("created_at", { ascending: false })
            .limit(5),
          supabase.from("clients").select("*").eq("firm_id", user!.id).order("legal_name"),
        ]);

        setProfile(profileData);
        setUsage(usageData ?? { user_id: user!.id, period_month: periodMonth, notices_used: 0 });
        setManualDrafts(manualRows ?? []);
        setClients(clientRows ?? []);

        // 2. Fetch Automated Ingested Email Notices Exclusively
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const response = await fetch("/api/notices?source=gmail", {
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

  // Handle Client Selection & Fetch Client's Notices
  const handleSelectClient = async (client: any) => {
    setSelectedClient(client);
    setSearchQuery(""); // Clear search bar dropdown
    
    // Fetch all notices specific to this client
    const { data: notices } = await supabase
      .from("notices")
      .select("*")
      .eq("user_id", user!.id)
      .ilike("client_name", `%${client.legal_name}%`)
      .order("created_at", { ascending: false });

    setClientNotices(notices || []);
  };

  const plan = profile ? getPlan(profile.plan) : null;
  const used = usage?.notices_used ?? 0;
  const limit = plan?.noticesPerMonth ?? 3;
  const limitReached = limit !== "unlimited" && used >= limit;

  // Filtered client search results
  const filteredClients = clients.filter((c) =>
    c.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.pan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      {/* Header */}
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

      {/* SEARCH CLIENT FEATURE WITH CLICK HANDLING */}
      <div className="mt-6 relative">
        <div className="max-w-md">
          <label className="block text-xs font-medium text-ink-600 mb-1">Search Client Database</label>
          <input
            type="text"
            placeholder="Search by Legal Name, GSTIN, or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-paper-line bg-white px-4 py-2 text-sm text-ink-950 placeholder-ink-400 focus:border-brass focus:outline-none"
          />
        </div>

        {/* Dropdown Search Results */}
        {searchQuery && (
          <div className="absolute z-20 mt-1 max-w-md w-full border border-paper-line bg-white shadow-lg max-h-60 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <p className="p-3 text-xs text-ink-500">No matching client found.</p>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left p-3 hover:bg-yellow-50/60 border-b border-paper-line last:border-0 transition"
                >
                  <p className="text-sm font-semibold text-ink-950">{client.legal_name}</p>
                  <p className="text-xs text-ink-500">
                    GSTIN: <span className="font-mono">{client.gstin || "N/A"}</span> | PAN: <span className="font-mono">{client.pan || "N/A"}</span>
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* CLIENT DETAILS DISPLAY MODAL/CARD */}
      {selectedClient && (
        <div className="mt-6 border border-brass/30 bg-brass/5 p-5 relative">
          <button
            onClick={() => setSelectedClient(null)}
            className="absolute top-3 right-3 text-xs text-ink-400 hover:text-ink-950 font-bold"
          >
            ✕ Close Details
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brass-dark bg-brass/20 px-2 py-0.5">
                Client Profile
              </span>
              <h2 className="text-xl font-semibold text-ink-950 mt-1">{selectedClient.legal_name}</h2>
            </div>
            <button
              onClick={() => navigate(`/app/clients/${selectedClient.id}`)}
              className="text-xs font-medium text-brass-dark underline hover:text-brass-light mr-8"
            >
              Go to Full Client Page →
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-brass/20 pt-4 text-xs">
            <div>
              <p className="text-ink-500">GSTIN</p>
              <p className="font-mono font-medium text-ink-950">{selectedClient.gstin || "Not Registered"}</p>
            </div>
            <div>
              <p className="text-ink-500">PAN</p>
              <p className="font-mono font-medium text-ink-950">{selectedClient.pan || "N/A"}</p>
            </div>
            <div>
              <p className="text-ink-500">Authorized Signatory</p>
              <p className="font-medium text-ink-950">{selectedClient.signatory_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-ink-500">Email Address</p>
              <p className="font-medium text-ink-950">{selectedClient.email || "N/A"}</p>
            </div>
          </div>

          {/* Client Notice History */}
          <div className="mt-5 border-t border-brass/20 pt-3">
            <p className="text-xs font-semibold text-ink-950 mb-2">Notices for {selectedClient.legal_name}:</p>
            {clientNotices.length === 0 ? (
              <p className="text-xs text-ink-500">No notice records found for this client.</p>
            ) : (
              <ul className="space-y-1.5">
                {clientNotices.map((n) => (
                  <li key={n.id} className="flex justify-between items-center bg-white p-2 border border-paper-line text-xs">
                    <div>
                      <span className="font-medium text-ink-950">{n.notice_type}</span>
                      <span className="text-ink-500 ml-2">({n.notice_reference_no || "No Ref"})</span>
                    </div>
                    <Link to={`/app/notices/${n.id}`} className="text-brass-dark underline font-medium">
                      View Notice Details
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Usage Card */}
      {!loading && plan && (
        <div className="mt-6 border border-paper-line bg-white p-5">
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
        </div>
      )}

      {/* SECTION 1: Automated Email Extraction & Processing */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-ink-950 mb-4">
          Automated Email Extraction & Processing
        </h2>

        {loading ? (
          <p className="text-sm text-ink-500">Checking for incoming email notices…</p>
        ) : automatedNotices.length === 0 ? (
          <div className="border border-dashed border-paper-line p-6 text-center bg-white">
            <p className="text-sm text-ink-600">
              No notices detected yet for <strong>shashankaffiliate11@gmail.com</strong>.
            </p>
            <p className="text-xs text-ink-400 mt-1">
              When a tax notice email arrives at this inbox, extracted details will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-paper-line bg-white">
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
                      {notice.firm_name || notice.client_name || "—"}
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

      {/* SECTION 2: Recent Manual Drafts */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-950">Recent manual drafts</h2>
          <Link to="/app/history" className="text-sm text-ink-600 hover:text-ink-950">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-ink-500">Loading manual drafts…</p>
        ) : manualDrafts.length === 0 ? (
          <div className="mt-4 border border-dashed border-paper-line p-8 text-center bg-white">
            <p className="text-sm text-ink-600">No manual drafts created yet.</p>
            <Link to="/app/new" className="mt-2 inline-block text-sm text-brass-dark underline">
              Draft your first response manually
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-paper-line border border-paper-line bg-white">
            {manualDrafts.map((notice) => (
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