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
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Gmail ingestion connection state — registered automatically at login
  // (see AuthContext.tsx / AuthCallback.tsx), never a manual step here.
  const [gmailConnectedEmail, setGmailConnectedEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<{ ok: boolean; message: string } | null>(null);

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
        setMobile((data as any)?.phone ?? "");
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await (supabase.from("gmail_connections" as any) as any)
        .select("connected_email")
        .eq("user_id", user.id)
        .maybeSingle();
      setGmailConnectedEmail(data?.connected_email ?? null);
      setGmailLoading(false);
    })();
  }, [user]);

  async function handleResync() {
    if (!user) return;
    setResyncing(true);
    setResyncResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/gmail/resync", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await response.json();
      if (!response.ok) {
        setResyncResult({ ok: false, message: data.error || "Resync failed." });
      } else {
        setResyncResult({ ok: true, message: "Watch is active — notice detection is live." });
      }
    } catch (err: any) {
      setResyncResult({ ok: false, message: err.message || "Resync failed." });
    } finally {
      setResyncing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, firm_name: firmName, ca_membership_no: membershipNo, phone: mobile })
      .eq("id", user.id);
    setSaving(false);
    if (!error) setSaved(true);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-ink-950">Settings</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 max-w-4xl items-start">
        <section className="border border-paper-line bg-white p-6">
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
              <label className="field-label" htmlFor="mobile">Mobile number</label>
              <input
                id="mobile"
                className="input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
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

        <section className="border border-paper-line bg-white p-6">
          <h2 className="font-semibold text-ink-950">Automatic notice detection</h2>
          <p className="mt-1 text-sm text-ink-600">
            NoticeDesk watches the Gmail account you sign in with and
            automatically detects incoming GST/Income-Tax notices — there's
            nothing separate to connect.
          </p>

          <div className="mt-4">
            {gmailLoading ? (
              <p className="text-sm text-ink-500">Checking connection…</p>
            ) : gmailConnectedEmail ? (
              <p className="text-sm text-ink-700">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-ok align-middle" />
                Watching: <span className="font-medium">{gmailConnectedEmail}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-700">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-warn align-middle" />
                Not connected yet. Sign out and sign back in with Google to enable automatic detection.
              </p>
            )}

            {gmailConnectedEmail && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleResync}
                  disabled={resyncing}
                  className="rounded border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-dim disabled:opacity-50"
                >
                  {resyncing ? "Checking…" : "Resync now"}
                </button>
                {resyncResult && (
                  <p className={`mt-2 text-xs ${resyncResult.ok ? "text-ok" : "text-warn"}`}>
                    {resyncResult.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
