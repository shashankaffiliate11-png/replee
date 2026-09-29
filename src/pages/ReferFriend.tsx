import { useEffect, useState } from "react";
import { Copy, Check, Gift } from "lucide-react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/database.types";

export default function ReferFriend() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ pending: 0, rewarded: 0, bonusDrafts: 0 });
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setProfileLoading(false);
      });
  }, [user]);

  // Referrals only work for Starter-plan users — this page loads the
  // referral tools only once we've confirmed that, rather than trusting
  // that whoever linked here already checked.
  const isStarter = profile?.plan === "starter";

  useEffect(() => {
    if (!user || !isStarter) return;

    (async () => {
      const { data: profileRow } = await (supabase.from("profiles") as any)
        .select("referral_code, bonus_drafts")
        .eq("id", user.id)
        .maybeSingle();

      let code = (profileRow as any)?.referral_code as string | undefined;

      if (!code) {
        // Generate once, on first visit to this page — short, unique enough
        // for a link people will actually type or click, not a UUID.
        code = `${user.id.slice(0, 6)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
        await (supabase.from("profiles") as any).update({ referral_code: code }).eq("id", user.id);
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
  }, [user, isStarter]);

  function copyReferralLink() {
    if (!referralCode) return;
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-ink-950">Refer & Earn</h1>

      <div className="mt-8 max-w-2xl">
        {profileLoading ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : !isStarter ? (
          <section className="border border-paper-line bg-white p-6">
            <div className="flex items-center gap-2">
              <Gift size={18} className="text-brass-dark" />
              <h2 className="font-semibold text-ink-950">Refer &amp; Earn</h2>
            </div>
            <p className="mt-2 text-sm text-ink-600">
              Referrals are available on the <strong className="text-ink-800">Starter</strong> plan.
              Upgrade or switch to Starter to get your referral link and start earning bonus drafts.
            </p>
            <a
              href="/pricing"
              className="mt-4 inline-block rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-white hover:bg-brass-dark"
            >
              View plans
            </a>
          </section>
        ) : (
          <section className="border border-paper-line bg-white p-6">
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
        )}
      </div>
    </AppShell>
  );
}
