import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? "");
  const [firmName, setFirmName] = useState("");
  const [membershipNo, setMembershipNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName || null,
      firm_name: firmName || "Independent Practice",
      ca_membership_no: membershipNo || null,
      plan: "free_trial",
    });

    setSaving(false);
    if (upsertError) {
      setError("Could not save your details. Please try again.");
      return;
    }
    navigate("/app", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md border border-paper-line bg-white p-7">
        <h1 className="text-xl font-semibold text-ink-950">A couple of details</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          This helps us format drafts with your firm's letterhead details.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="fullName">Your name</label>
            <input
              id="fullName"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="CA Priya Sharma"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="firmName">Firm name</label>
            <input
              id="firmName"
              className="input"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Sharma & Associates, or leave blank if independent"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="membershipNo">ICAI membership no. (optional)</label>
            <input
              id="membershipNo"
              className="input"
              value={membershipNo}
              onChange={(e) => setMembershipNo(e.target.value)}
              placeholder="123456"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-warn">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary mt-7 w-full">
          {saving ? "Saving…" : "Continue to dashboard"}
        </button>
      </form>
    </div>
  );
}
