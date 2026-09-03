import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";
import type { Notice } from "../lib/database.types";

export default function NoticeDetail() {
  const { id } = useParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editedText, setEditedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("notices")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data }) => {
        setNotice(data);
        setEditedText(data?.final_response ?? data?.ai_draft_response ?? "");
        setLoading(false);

        if (data?.notice_file_path) {
          // Signed URL, not a public one — the bucket is private, so this
          // link works for a limited time only.
          const { data: signed } = await supabase.storage
            .from("notice-uploads")
            .createSignedUrl(data.notice_file_path, 60 * 15);
          if (signed) setFileUrl(signed.signedUrl);
        }
      });
  }, [id]);

  async function handleSave() {
    if (!notice) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("notices")
      .update({ final_response: editedText, status: "edited" })
      .eq("id", notice.id);
    setSaving(false);
    if (!error) setSaved(true);
  }

  async function handleFinalize() {
    if (!notice) return;
    setSaving(true);
    const { error } = await supabase
      .from("notices")
      .update({ final_response: editedText, status: "finalized" })
      .eq("id", notice.id);
    setSaving(false);
    if (!error) setNotice({ ...notice, status: "finalized" });
  }

  function handleDownload() {
    const blob = new Blob([editedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notice?.client_name ?? "notice-response"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-ink-500">Loading…</p>
      </AppShell>
    );
  }

  if (!notice) {
    return (
      <AppShell>
        <p className="text-sm text-ink-600">Draft not found.</p>
        <Link to="/app" className="mt-2 inline-block text-sm text-brass-dark underline">
          Back to dashboard
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">{notice.client_name}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {notice.notice_type}
            {notice.notice_reference_no ? ` · ${notice.notice_reference_no}` : ""}
          </p>
        </div>
        <span className="border border-paper-line px-2.5 py-1 text-xs uppercase tracking-wide text-ink-500">
          {notice.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="field-label">
            {notice.notice_file_path ? "Notice summary (extracted from upload)" : "Original notice"}
          </h2>
          <div className="mt-1 max-h-[420px] overflow-y-auto border border-paper-line bg-paper-dim p-4 text-sm text-ink-700 whitespace-pre-wrap">
            {notice.original_notice_text}
          </div>
          {notice.notice_file_path && (
            <a
              href={fileUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-block text-sm text-brass-dark underline ${
                fileUrl ? "" : "pointer-events-none opacity-50"
              }`}
            >
              {fileUrl ? "View original uploaded file" : "Loading file link…"}
            </a>
          )}
        </div>

        <div>
          <h2 className="field-label">Draft response — review and edit</h2>
          <textarea
            className="input mt-1 min-h-[420px] font-mono text-[13px] leading-relaxed"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-secondary">
          {saving ? "Saving…" : "Save edits"}
        </button>
        <button onClick={handleFinalize} disabled={saving} className="btn-primary">
          Mark as finalized
        </button>
        <button onClick={handleDownload} className="btn-secondary">
          Download as text
        </button>
        {saved && <span className="text-sm text-ok">Saved</span>}
      </div>

      <p className="mt-6 max-w-prose text-xs text-ink-400">
        This is a draft for your professional review. Verify figures, section
        references, and facts against the client's records before filing.
      </p>
    </AppShell>
  );
}
