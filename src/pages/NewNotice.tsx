import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";

const NOTICE_TYPES = [
  "GST ASMT-10 (Scrutiny of returns)",
  "GST DRC-01 (Show cause notice)",
  "GST REG-17 (Cancellation of registration)",
  "Income Tax 143(1) (Intimation)",
  "Income Tax 143(2) (Scrutiny)",
  "Income Tax 148 (Reassessment)",
  "TDS default notice",
  "Other",
];

export default function NewNotice() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [noticeType, setNoticeType] = useState(NOTICE_TYPES[0]);
  const [referenceNo, setReferenceNo] = useState("");
  const [noticeText, setNoticeText] = useState("");
  const [caseFacts, setCaseFacts] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Your session expired. Please sign in again.");
      setSubmitting(false);
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke("draft-notice", {
      body: {
        client_name: clientName,
        notice_type: noticeType,
        notice_reference_no: referenceNo || null,
        original_notice_text: noticeText,
        case_facts: caseFacts,
      },
    });

    setSubmitting(false);

    if (fnError) {
      // The function returns a structured error body for known cases
      // (e.g. plan limit reached) — surface that message if present.
      const message =
        (fnError as any)?.context?.body?.error ??
        "Could not generate a draft right now. Please try again.";
      setError(message);
      return;
    }

    if (data?.notice_id) {
      navigate(`/app/notices/${data.notice_id}`);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-ink-950">New draft</h1>
      <p className="mt-1 text-sm text-ink-600">
        The more case-specific detail you add, the less editing the draft needs.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="clientName">Client name</label>
            <input
              id="clientName"
              className="input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="ABC Traders Pvt Ltd"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="referenceNo">Notice reference no. (optional)</label>
            <input
              id="referenceNo"
              className="input"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="ZD2908240123456"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="noticeType">Notice type</label>
          <select
            id="noticeType"
            className="input"
            value={noticeType}
            onChange={(e) => setNoticeType(e.target.value)}
          >
            {NOTICE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="noticeText">Notice text</label>
          <textarea
            id="noticeText"
            className="input min-h-[160px]"
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="Paste the full text of the notice here…"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="caseFacts">
            Case facts for your response
          </label>
          <textarea
            id="caseFacts"
            className="input min-h-[140px]"
            value={caseFacts}
            onChange={(e) => setCaseFacts(e.target.value)}
            placeholder="E.g. The mismatch is due to invoices raised in March but reflected in the recipient's GSTR-2A in April. Reconciliation is attached. Client has no prior defaults."
            required
          />
        </div>

        {error && (
          <div className="border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Drafting…" : "Generate draft"}
        </button>
      </form>
    </AppShell>
  );
}
