import { useEffect, useState } from "react";
import { Copy, Check, Gift } from "lucide-react";
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

  // Referral state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ pending: 0, rewarded: 0, bonusDrafts: 0 });
  const [linkCopied, setLinkCopied] = useState(false);

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
        setMobile((data as any)?.phone ?? "");
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("referral_code, bonus_drafts")
        .eq("id", user.id)
        .maybeSingle();

      let code = (profileRow as any)?.referral_code as string | undefined;

      if (!code) {
        // Generate once, on first visit to Settings — short, unique enough
        // for a link people will actually type or click, not a UUID.
        code = `${user.id.slice(0, 6)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
        await supabase.from("profiles").update({ referral_code: code }).eq("id", user.id);
      }
      setReferralCode(code);

      const { data: referrals } = await supabase
        .from("referrals" as any)
        .select("status")
        .eq("referrer_id", user.id);

      const pending = (referrals ?? []).filter((r: any) => r.status === "pending").length;
      const rewarded = (referrals ?? []).filter((r: any) => r.status === "rewarded").length;

      setReferralStats({
        pending,
        rewarded,
        bonusDrafts: (profileRow as any)?.bonus_drafts ?? 0,
      });
    })();
  }, [user]);

  function copyReferralLink() {
    if (!referralCode) return;
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

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

        <section className="border border-paper-line bg-white p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-brass-dark" />
            <h2 className="font-semibold text-ink-950">Refer &amp; Earn</h2>
          </div>
          <p className="mt-1 text-sm text-ink-600">
            Share your link with other CAs. When someone signs up and creates their first draft,
            you both get <strong className="text-ink-800">5 bonus drafts</strong>, on top of your
            plan's monthly limit.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={referralCode ? `${window.location.origin}/?ref=${referralCode}` : "Generating your link…"}
              className="input flex-1 min-w-[240px] font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copyReferralLink}
              disabled={!referralCode}
              className="btn-secondary flex items-center gap-1.5 whitespace-nowrap"
            >
              {linkCopied ? <Check size={14} /> : <Copy size={14} />}
              {linkCopied ? "Copied" : "Copy link"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-paper-line pt-4 text-center">
            <div>
              <p className="text-xl font-semibold text-ink-950">{referralStats.pending}</p>
              <p className="text-xs text-ink-500">Awaiting first draft</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-ink-950">{referralStats.rewarded}</p>
              <p className="text-xs text-ink-500">Successful referrals</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-brass-dark">{referralStats.bonusDrafts}</p>
              <p className="text-xs text-ink-500">Bonus drafts earned</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
