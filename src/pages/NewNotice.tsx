import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import NoticeExtractionForm from "../components/NoticeExtractionForm";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { NoticeData } from "../types/notice";

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

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default function NewNotice() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [noticeText, setNoticeText] = useState("");

  const [clientName, setClientName] = useState("");
  const [noticeType, setNoticeType] = useState(NOTICE_TYPES[0]);
  const [referenceNo, setReferenceNo] = useState("");
  const [caseFacts, setCaseFacts] = useState("");
  const [extractedNoticeData, setExtractedNoticeData] = useState<NoticeData | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDataConfirmed(data: NoticeData, uploadedFile: File) {
    setExtractedNoticeData(data);
    setFile(uploadedFile);
    if (data.notice_ref_no) setReferenceNo(data.notice_ref_no);
    if (data.discrepancy_details) setCaseFacts(data.discrepancy_details);
    if (data.notice_type) {
      const matchedType = NOTICE_TYPES.find((t) =>
        t.toLowerCase().includes(data.notice_type!.toLowerCase())
      );
      if (matchedType) setNoticeType(matchedType);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Please upload a PDF, PNG, or JPG file.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("File is larger than 10 MB. Try a smaller scan or compress the PDF.");
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (inputMode === "upload" && !file) {
      setError("Attach the notice file, or switch to pasting the text instead.");
      return;
    }
    if (inputMode === "paste" && !noticeText.trim()) {
      setError("Paste the notice text, or switch to uploading the file instead.");
      return;
    }
    if (!user) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    setSubmitting(true);

    let noticeFilePath: string | null = null;

    if (inputMode === "upload" && file) {
      setStatusMessage("Uploading notice…");
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("notice-uploads")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError("Could not upload the file. Please try again.");
        setSubmitting(false);
        setStatusMessage(null);
        return;
      }
      noticeFilePath = path;
    }

    setStatusMessage("Reading the notice and drafting a response…");

    const { data, error: fnError } = await supabase.functions.invoke("draft-notice", {
      body: {
        client_name: clientName,
        notice_type: noticeType,
        notice_reference_no: referenceNo || null,
        notice_file_path: noticeFilePath,
        original_notice_text: inputMode === "paste" ? noticeText : null,
        case_facts: caseFacts,
        extracted_data: extractedNoticeData,
      },
    });

    setSubmitting(false);
    setStatusMessage(null);

    if (fnError) {
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
        Extract information from notice PDF and generate an automated reply draft.
      </p>

      {inputMode === "upload" && (
        <div className="mt-6 max-w-2xl">
          <NoticeExtractionForm onDataConfirmed={handleDataConfirmed} />
        </div>
      )}

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
            <label className="field-label" htmlFor="referenceNo">Notice reference no.</label>
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
          <div className="flex gap-1 border border-paper-line bg-paper-dim p-1 text-sm">
            <button
              type="button"
              onClick={() => setInputMode("upload")}
              className={`flex-1 py-2 font-medium ${
                inputMode === "upload" ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"
              }`}
            >
              Upload notice file
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`flex-1 py-2 font-medium ${
                inputMode === "paste" ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"
              }`}
            >
              Paste text instead
            </button>
          </div>

          {inputMode === "upload" ? (
            <div className="mt-3 text-xs text-ink-600">
              {file ? `Attached File: ${file.name}` : "Upload PDF using the extraction form above."}
            </div>
          ) : (
            <textarea
              className="input mt-3 min-h-[160px]"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="Paste the full text of the notice here…"
            />
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="caseFacts">
            Case facts / Discrepancy details
          </label>
          <textarea
            id="caseFacts"
            className="input min-h-[140px]"
            value={caseFacts}
            onChange={(e) => setCaseFacts(e.target.value)}
            placeholder="Details about the notice..."
            required
          />
        </div>

        {error && (
          <div className="border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {statusMessage ?? (submitting ? "Drafting…" : "Generate draft")}
        </button>
      </form>
    </AppShell>
  );
}