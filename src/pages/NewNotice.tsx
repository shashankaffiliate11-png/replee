import React, { useState, useEffect, useRef } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface ClientRecord {
  id: string;
  legal_name: string;
  trade_name?: string;
  pan?: string;
  entity_type?: string;
  registered_address?: string;
  state?: string;
  pincode?: string;
  signatory_name?: string;
  signatory_designation?: string;
  signatory_contact?: string;
  notes?: string;
}

export default function NewNotice() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientRecord[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [noticeType, setNoticeType] = useState("GST ASMT-10 (Scrutiny of returns)");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      if (!user) return;
      try {
        let query = (supabase.from("clients" as any) as any).select("*").eq("firm_id", user.id);
        if (searchQuery.trim().length > 0) {
          query = query.or(
            `legal_name.ilike.%${searchQuery}%,trade_name.ilike.%${searchQuery}%,signatory_name.ilike.%${searchQuery}%`
          );
        }
        const { data, error: dbErr } = await query.limit(10);
        if (dbErr) throw dbErr;
        setClientOptions(data || []);
      } catch (err: any) {
        console.error("Error fetching clients:", err);
      }
    };

    const timer = setTimeout(() => {
      fetchClients();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFilePreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const isPreviewAvailable = Boolean(file || (inputMode === "paste" && pastedText.trim().length > 0));

  const handleGenerateDraft = async () => {
    if (!selectedClient) {
      setError("Please search and select a client first.");
      return;
    }

    if (inputMode === "upload" && !file) {
      setError("Please select a file to upload.");
      return;
    }

    if (inputMode === "paste" && !pastedText.trim()) {
      setError("Please paste notice text before generating.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      let noticeFilePath = null;

      if (inputMode === "upload" && file && user) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("notice-uploads")
          .upload(filePath, file);

        if (uploadErr) throw uploadErr;
        noticeFilePath = filePath;
      }

      const { data, error: genError } = await supabase.functions.invoke("draft-notice", {
        body: {
          client_name: selectedClient.legal_name,
          client_details: selectedClient,
          notice_type: noticeType,
          notice_file_path: noticeFilePath,
          original_notice_text: inputMode === "paste" ? pastedText : null,
        },
      });

      if (genError) throw genError;
      if (data?.error) throw new Error(data.error);

      if (data?.notice_id) {
        navigate(`/app/notices/${data.notice_id}`);
      } else {
        navigate("/app/history");
      }
    } catch (err: any) {
      console.error("Draft generation error:", err);
      setError(err.message || "Failed to generate response draft.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink-950 mb-1">Draft New Response</h1>
        <p className="text-sm text-ink-600 mb-6">Select a client and upload notice to generate automated response.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-1">
                Client Name
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="Search Client by Name, Trade Name, or Signatory..."
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
              />

              {isDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-paper-line rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {clientOptions.length > 0 ? (
                    clientOptions.map((client) => (
                      <div
                        key={client.id}
                        className="px-4 py-2 hover:bg-paper-dim cursor-pointer text-sm text-ink-900 border-b border-paper-line last:border-b-0"
                        onClick={() => {
                          setSelectedClient(client);
                          setSearchQuery(client.legal_name);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium">{client.legal_name}</div>
                        {client.trade_name && (
                          <div className="text-xs text-ink-500">Trade: {client.trade_name} | PAN: {client.pan || 'N/A'}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-ink-500 text-center">
                      No onboarded clients found.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-1">
                Notice Type
              </label>
              <select
                className="input w-full bg-white"
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value)}
              >
                <option value="GST ASMT-10 (Scrutiny of returns)">GST ASMT-10 (Scrutiny of returns)</option>
                <option value="GST DRC-01 (Show Cause Notice)">GST DRC-01 (Show Cause Notice)</option>
                <option value="Income Tax Sec 148 (Reassessment)">Income Tax Sec 148 (Reassessment)</option>
                <option value="Income Tax Sec 143(1) (Intimation)">Income Tax Sec 143(1) (Intimation)</option>
                <option value="General Legal Response">General Legal Response</option>
              </select>
            </div>

            <div>
              <div className="flex border-b border-paper-line mb-4">
                <button
                  type="button"
                  className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                    inputMode === "upload"
                      ? "border-amber-500 text-ink-950 font-semibold"
                      : "border-transparent text-ink-500 hover:text-ink-900"
                  }`}
                  onClick={() => setInputMode("upload")}
                >
                  Upload notice file
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                    inputMode === "paste"
                      ? "border-amber-500 text-ink-950 font-semibold"
                      : "border-transparent text-ink-500 hover:text-ink-900"
                  }`}
                  onClick={() => setInputMode("paste")}
                >
                  Paste text instead
                </button>
              </div>

              {inputMode === "upload" ? (
                <div className="border-2 border-dashed border-paper-line p-8 text-center rounded-md bg-paper-dim flex flex-col items-center justify-center min-h-[180px]">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="notice-doc-upload"
                  />
                  <label
                    htmlFor="notice-doc-upload"
                    className="cursor-pointer font-medium text-sm text-blue-600 hover:underline"
                  >
                    Click to upload PDF
                  </label>
                  <p className="text-xs text-ink-400 mt-1">PDF up to 8MB</p>
                  {file && <p className="mt-2 text-xs font-semibold text-emerald-600">Selected: {file.name}</p>}
                </div>
              ) : (
                <div>
                  <textarea
                    className="input w-full min-h-[180px] text-xs font-mono"
                    placeholder="Paste full notice text contents here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={!isPreviewAvailable}
                onClick={() => setShowPreviewModal(true)}
                className={`px-4 py-2 text-xs font-medium border rounded-md transition-colors ${
                  isPreviewAvailable
                    ? "border-ink-950 text-ink-950 hover:bg-paper-dim cursor-pointer"
                    : "border-paper-line text-ink-300 cursor-not-allowed"
                }`}
              >
                Preview Document
              </button>

              <button
                type="button"
                disabled={generating}
                onClick={handleGenerateDraft}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2 rounded-md text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {generating ? "Generating Draft..." : "Generate draft"}
              </button>
            </div>
          </div>

          <div className="border border-paper-line bg-white p-6 rounded-lg shadow-sm h-fit">
            <h2 className="text-lg font-medium text-ink-900 mb-4">Client Details</h2>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">LEGAL NAME *</label>
                <input
                  type="text"
                  readOnly
                  className="input w-full bg-paper-dim cursor-not-allowed"
                  value={selectedClient?.legal_name || ""}
                  placeholder="ABC Traders Pvt Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">TRADE NAME</label>
                  <input
                    type="text"
                    readOnly
                    className="input w-full bg-paper-dim cursor-not-allowed"
                    value={selectedClient?.trade_name || ""}
                    placeholder="ABC Traders"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">PAN</label>
                  <input
                    type="text"
                    readOnly
                    className="input w-full bg-paper-dim cursor-not-allowed"
                    value={selectedClient?.pan || ""}
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">ENTITY TYPE</label>
                <input
                  type="text"
                  readOnly
                  className="input w-full bg-paper-dim cursor-not-allowed"
                  value={selectedClient?.entity_type || ""}
                  placeholder="Private Limited / Partnership / Proprietorship"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">REGISTERED ADDRESS</label>
                <textarea
                  readOnly
                  className="input w-full bg-paper-dim min-h-[60px] cursor-not-allowed"
                  value={selectedClient?.registered_address || ""}
                  placeholder="Full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">STATE</label>
                  <input
                    type="text"
                    readOnly
                    className="input w-full bg-paper-dim cursor-not-allowed"
                    value={selectedClient?.state || ""}
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">PINCODE</label>
                  <input
                    type="text"
                    readOnly
                    className="input w-full bg-paper-dim cursor-not-allowed"
                    value={selectedClient?.pincode || ""}
                    placeholder="400001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">SIGNATORY NAME</label>
                  <input
                    type="text"
                    readOnly
                    className="input w-full bg-paper-dim cursor-not-allowed"
                    value={selectedClient?.signatory_name || ""}
                    placeholder="Authorized person name"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">SIGNATORY DESIGNATION</label>
                  <input
                    type="text"
                    readOnly
                    className="input w-full bg-paper-dim cursor-not-allowed"
                    value={selectedClient?.signatory_designation || ""}
                    placeholder="Director / Partner"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">SIGNATORY CONTACT</label>
                <input
                  type="text"
                  readOnly
                  className="input w-full bg-paper-dim cursor-not-allowed"
                  value={selectedClient?.signatory_contact || ""}
                  placeholder="Email or phone number"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-500 uppercase tracking-wide mb-1">NOTES</label>
                <textarea
                  readOnly
                  className="input w-full bg-paper-dim min-h-[50px] cursor-not-allowed"
                  value={selectedClient?.notes || ""}
                  placeholder="Additional notes about client..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-paper-line flex items-center justify-between bg-paper-dim">
              <h3 className="text-sm font-semibold text-ink-950">Notice Document Preview</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-3 py-1 bg-ink-950 text-white text-xs rounded hover:bg-ink-800 transition-colors"
              >
                Close Preview
              </button>
            </div>

            <div className="flex-1 p-6 overflow-auto bg-gray-100 flex items-center justify-center">
              {inputMode === "upload" && filePreviewUrl ? (
                file?.type === "application/pdf" ? (
                  <iframe src={filePreviewUrl} className="w-full h-full border-0 rounded" title="PDF Preview" />
                ) : (
                  <img src={filePreviewUrl} alt="Notice Preview" className="max-w-full max-h-full object-contain" />
                )
              ) : (
                <div className="w-full h-full bg-white p-6 rounded border border-paper-line overflow-y-auto whitespace-pre-wrap font-mono text-xs text-ink-900">
                  {pastedText || "No content available to preview."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}