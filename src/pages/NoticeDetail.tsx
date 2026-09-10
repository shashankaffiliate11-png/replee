import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Document, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
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
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"docx" | "pdf" | null>(null);
  const [downloading, setDownloading] = useState(false);

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
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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

  async function handleConfirmDownload() {
    if (!downloadFormat) return;
    setDownloading(true);
    const filenameBase = notice?.client_name ?? "notice-response";

    try {
      if (downloadFormat === "docx") {
        const paragraphs = editedText
          .split("\n")
          .map((line) => new Paragraph({ children: [new TextRun(line)] }));
        const doc = new Document({ sections: [{ children: paragraphs }] });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenameBase}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const doc = new jsPDF();
        const marginLeft = 15;
        const marginTop = 20;
        const lineHeight = 7;
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxLinesPerPage = Math.floor((pageHeight - marginTop - 15) / lineHeight);

        doc.setFontSize(11);
        const lines = doc.splitTextToSize(editedText, 180);

        let cursorY = marginTop;
        let lineCount = 0;
        for (const line of lines) {
          if (lineCount >= maxLinesPerPage) {
            doc.addPage();
            cursorY = marginTop;
            lineCount = 0;
          }
          doc.text(line, marginLeft, cursorY);
          cursorY += lineHeight;
          lineCount++;
        }
        doc.save(`${filenameBase}.pdf`);
      }
    } finally {
      setDownloading(false);
      setDownloadMenuOpen(false);
      setDownloadFormat(null);
    }
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

          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            {saved && <span className="text-sm font-medium text-ok">Changes Saved</span>}

            <button onClick={handleSave} disabled={saving} className="btn-secondary">
              {saving ? "Saving…" : "Save edits"}
            </button>
            <button onClick={handleFinalize} disabled={saving} className="btn-primary">
              Mark as finalized
            </button>

            <div className="relative">
              <button
                onClick={() => setDownloadMenuOpen((v) => !v)}
                className="btn-secondary"
              >
                DOWNLOAD
              </button>

              {downloadMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-paper-line bg-white p-3 shadow-lg">
                  <p className="text-xs font-medium text-ink-700 mb-2">Choose a format:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDownloadFormat("docx")}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                        downloadFormat === "docx"
                          ? "border-brass bg-brass-tint text-brass-dark"
                          : "border-paper-line text-ink-700 hover:bg-paper-dim"
                      }`}
                    >
                      Word (.docx)
                    </button>
                    <button
                      onClick={() => setDownloadFormat("pdf")}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                        downloadFormat === "pdf"
                          ? "border-brass bg-brass-tint text-brass-dark"
                          : "border-paper-line text-ink-700 hover:bg-paper-dim"
                      }`}
                    >
                      PDF
                    </button>
                  </div>
                  <button
                    onClick={handleConfirmDownload}
                    disabled={!downloadFormat || downloading}
                    className="btn-primary mt-3 w-full disabled:opacity-40"
                  >
                    {downloading ? "Preparing…" : "DOWNLOAD"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-prose text-xs text-ink-400">
        This is a draft for your professional review. Verify figures, section
        references, and facts against the client's records before filing.
      </p>
    </AppShell>
  );
}
