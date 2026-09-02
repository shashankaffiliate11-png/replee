import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getPlan } from "../lib/plans";
import type { Profile } from "../lib/database.types";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [membershipNo, setMembershipNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const plan = profile ? getPlan(profile.plan) : null;

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

      <section className="mt-8 max-w-md border border-paper-line bg-white p-6">
        <h2 className="font-semibold text-ink-950">Plan</h2>
        {plan && (
          <>
            <p className="mt-2 text-sm text-ink-700">
              You're on the <span className="font-medium text-ink-950">{plan.name}</span> plan.
            </p>
            <Link to="/pricing" className="btn-secondary mt-4 inline-flex">
              {plan.code === "free_trial" ? "Upgrade plan" : "Change plan"}
            </Link>
          </>
        )}
      </section>
    </AppShell>
  );
}
