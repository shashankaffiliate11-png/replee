import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Notice } from "../lib/database.types";
import type { ClientRecord } from "../components/ClientSearch";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [pan, setPan] = useState("");
  const [entityType, setEntityType] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [signatoryContact, setSignatoryContact] = useState("");
  const [notes, setNotes] = useState("");

  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    (async () => {
      const { data, error } = await (supabase.from("clients" as any) as any)
        .select(
          "id, legal_name, trade_name, pan, entity_type, registered_address, state, pincode, signatory_name, signatory_designation, signatory_contact, notes"
        )
        .eq("id", id)
        .eq("firm_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const client = data as ClientRecord;
      setLegalName(client.legal_name ?? "");
      setTradeName(client.trade_name ?? "");
      setPan(client.pan ?? "");
      setEntityType(client.entity_type ?? "");
      setRegisteredAddress(client.registered_address ?? "");
      setState(client.state ?? "");
      setPincode(client.pincode ?? "");
      setSignatoryName(client.signatory_name ?? "");
      setSignatoryDesignation(client.signatory_designation ?? "");
      setSignatoryContact(client.signatory_contact ?? "");
      setNotes(client.notes ?? "");
      setLoading(false);
    })();
  }, [user, id]);

  useEffect(() => {
    if (!user || !legalName) return;
    setNoticesLoading(true);
    supabase
      .from("notices")
      .select("*")
      .eq("user_id", user.id)
      .ilike("client_name", `%${legalName}%`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotices(data ?? []);
        setNoticesLoading(false);
      });
  }, [user, legalName]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setSaved(false);

    const { error } = await (supabase.from("clients" as any) as any)
      .update({
        legal_name: legalName,
        trade_name: tradeName || null,
        pan: pan || null,
        entity_type: entityType || null,
        registered_address: registeredAddress || null,
        state: state || null,
        pincode: pincode || null,
        signatory_name: signatoryName || null,
        signatory_designation: signatoryDesignation || null,
        signatory_contact: signatoryContact || null,
        notes: notes || null,
      })
      .eq("id", id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-ink-500">Loading client…</p>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell>
        <p className="text-sm text-ink-600">Client not found.</p>
        <button onClick={() => navigate("/app")} className="btn-secondary mt-4">
          Back to Dashboard
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">{legalName}</h1>
          <p className="mt-1 text-sm text-ink-600">Client profile</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-medium text-ok">Changes Saved</span>}
          <button onClick={() => navigate("/app")} className="btn-secondary">
            Back
          </button>
          <button form="client-detail-form" type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <form
        id="client-detail-form"
        onSubmit={handleSave}
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-white p-6 border border-paper-line rounded-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="field-label">Legal Name *</label>
            <input
              className="input w-full"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Trade Name</label>
              <input className="input w-full" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">PAN</label>
              <input
                className="input w-full uppercase"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Entity Type</label>
            <input className="input w-full" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Signatory Name</label>
              <input
                className="input w-full"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Signatory Designation</label>
              <input
                className="input w-full"
                value={signatoryDesignation}
                onChange={(e) => setSignatoryDesignation(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Signatory Contact</label>
            <input
              className="input w-full"
              value={signatoryContact}
              onChange={(e) => setSignatoryContact(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="field-label">Registered Address</label>
            <textarea
              className="input w-full min-h-[80px]"
              value={registeredAddress}
              onChange={(e) => setRegisteredAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">State</label>
              <input className="input w-full" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Pincode</label>
              <input className="input w-full" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea
              className="input w-full min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink-950">Response History</h2>
        <p className="text-sm text-ink-500">All notices and drafts generated for {legalName}</p>

        {noticesLoading ? (
          <p className="mt-4 text-sm text-ink-500">Loading history…</p>
        ) : notices.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-paper-line p-8 text-center">
            <p className="text-sm text-ink-600">No responses generated yet for this client.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-paper-line rounded-lg border border-paper-line bg-white">
            {notices.map((n) => (
              <Link
                key={n.id}
                to={`/app/notices/${n.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-paper-dim"
              >
                <div>
                  <p className="text-sm font-medium text-ink-950">{n.notice_type}</p>
                  <p className="text-xs text-ink-500">{n.notice_reference_no || "No reference no."}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">
                    {new Date(n.created_at).toLocaleDateString("en-IN")}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-ink-400">{n.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
