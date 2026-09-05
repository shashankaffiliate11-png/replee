import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/database.types";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [membershipNo, setMembershipNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Gmail ingestion connection state
  const [gmailConnectedEmail, setGmailConnectedEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailBanner, setGmailBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setFullName(data?.full_name ?? "");
        setFirmName(data?.firm_name ?? "");
        setMembershipNo(data?.ca_membership_no ?? "");
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Reflect the redirect back from /api/gmail/oauth-callback
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get("gmail");
    if (gmailStatus === "connected") {
      setGmailBanner({ type: "success", message: "Gmail connected — new tax notices will now be detected automatically." });
      window.history.replaceState({}, "", "/app/settings");
    } else if (gmailStatus === "error") {
      setGmailBanner({ type: "error", message: `Couldn't connect Gmail (${params.get("reason") || "unknown error"}). Please try again.` });
      window.history.replaceState({}, "", "/app/settings");
    }

    (async () => {
      const { data } = await (supabase.from("gmail_connections" as any) as any)
        .select("connected_email")
        .eq("user_id", user.id)
        .maybeSingle();
      setGmailConnectedEmail(data?.connected_email ?? null);
      setGmailLoading(false);
    })();
  }, [user]);

  async function handleConnectGmail() {
    setGmailConnecting(true);
    setGmailBanner(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/gmail/connect-url", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to start Gmail connection.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setGmailBanner({ type: "error", message: err.message || "Failed to start Gmail connection." });
      setGmailConnecting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, firm_name: firmName, ca_membership_no: membershipNo })
      .eq("id", user.id);
    setSaving(false);
    if (!error) setSaved(true);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-ink-950">Settings</h1>

      <section className="mt-8 max-w-md border border-paper-line bg-white p-6">
        <h2 className="font-semibold text-ink-950">Profile</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="field-label" htmlFor="fullName">Name</label>
            <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="firmName">Firm name</label>
            <input id="firmName" className="input" value={firmName} onChange={(e) => setFirmName(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="membershipNo">ICAI membership no.</label>
            <input
              id="membershipNo"
              className="input"
              value={membershipNo}
              onChange={(e) => setMembershipNo(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <p className="text-sm text-ink-700">{user?.email}</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="ml-3 text-sm text-ok">Saved</span>}
        </form>
      </section>

      <section className="mt-6 max-w-md border border-paper-line bg-white p-6">
        <h2 className="font-semibold text-ink-950">Automatic notice detection</h2>
        <p className="mt-1 text-sm text-ink-600">
          Connect your Gmail inbox so NoticeDesk can automatically detect incoming GST/Income-Tax
          notices and pre-fill drafts for you.
        </p>

        {gmailBanner && (
          <div
            className={`mt-4 p-3 text-xs rounded-md border ${
              gmailBanner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {gmailBanner.message}
          </div>
        )}

        <div className="mt-4">
          {gmailLoading ? (
            <p className="text-sm text-ink-500">Checking connection…</p>
          ) : gmailConnectedEmail ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-700">
                Connected: <span className="font-medium">{gmailConnectedEmail}</span>
              </p>
              <button
                onClick={handleConnectGmail}
                disabled={gmailConnecting}
                className="text-sm font-medium text-brass-dark hover:text-brass-light underline disabled:opacity-50"
              >
                {gmailConnecting ? "Reconnecting…" : "Reconnect"}
              </button>
            </div>
          ) : (
            <button onClick={handleConnectGmail} disabled={gmailConnecting} className="btn-primary">
              {gmailConnecting ? "Redirecting to Google…" : "Connect Gmail"}
            </button>
          )}
        </div>
      </section>
    </AppShell>
  );
}
