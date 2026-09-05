import React, { useState } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function OnboardClient() {
  const { user } = useAuth();

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

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const base64File = await fileToBase64(selectedFile);

      const { data, error: fnError } = await supabase.functions.invoke("extract-client-docs", {
        body: { base64File, mimeType: selectedFile.type },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Only fill fields the extractor actually found — never blank out
      // something the CA may have already typed with a null.
      if (data?.legal_name) setLegalName(data.legal_name);
      if (data?.trade_name) setTradeName(data.trade_name);
      if (data?.pan) setPan(data.pan);
      if (data?.entity_type) setEntityType(data.entity_type);
      if (data?.registered_address) setRegisteredAddress(data.registered_address);
      if (data?.state) setState(data.state);
      if (data?.pincode) setPincode(data.pincode);
      if (data?.signatory_name) setSignatoryName(data.signatory_name);

      setSuccessMessage("Document parsed. Fields have been pre-filled — please review before saving.");
    } catch (err: any) {
      console.error("Document parse error:", err);
      setError(err.message || "Failed to parse document. Please fill the details manually.");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!legalName.trim()) {
      setError("Legal Name is required.");
      return;
    }

    if (!user) {
      setError("You must be logged in to onboard a client.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: dbError } = await (supabase.from("clients" as any) as any).insert({
        firm_id: user.id,
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
      });

      if (dbError) throw dbError;

      setSuccessMessage("Client onboarded successfully!");
      
      // Reset form fields
      setLegalName("");
      setTradeName("");
      setPan("");
      setEntityType("");
      setRegisteredAddress("");
      setState("");
      setPincode("");
      setSignatoryName("");
      setSignatoryDesignation("");
      setSignatoryContact("");
      setNotes("");
      setFile(null);
    } catch (err: any) {
      console.error("Error onboarding client:", err);
      setError(err.message || "Failed to onboard client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-1">
        {/* Page Header */}
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-ink-950 mb-0.5">Onboard Client</h1>
          <p className="text-xs text-ink-600">
            Upload onboarding documents (GST, Partnership Deed, PAN, etc.) to auto-populate client fields.
          </p>
        </div>

        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Document Upload Area */}
          <div className="flex justify-center">
            <div className="w-full max-w-md bg-white border border-paper-line rounded-lg p-3 text-center shadow-sm">
              <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                Upload Document
              </label>
              <p className="text-xs text-ink-500 mb-1.5">Supported formats: PDF, PNG, JPG (up to 10MB)</p>

              <div className="bg-paper-dim border border-dashed border-paper-line rounded-md p-2 flex flex-col items-center justify-center">
                <input
                  type="file"
                  id="client-doc-upload"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="client-doc-upload"
                  className="cursor-pointer text-xs font-medium text-ink-800 hover:text-ink-950 underline"
                >
                  {parsing ? "Parsing document..." : "Click to select or drop document here"}
                </label>
                {file && <p className="mt-1 text-xs text-emerald-600 font-medium">Selected: {file.name}</p>}
              </div>
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center justify-center my-1">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-widest">OR</span>
          </div>

          {/* Form Fields - 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 bg-white p-4 border border-paper-line rounded-lg shadow-sm">
            {/* Left Column */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                  LEGAL NAME *
                </label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="ABC Traders Pvt Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                    TRADE NAME
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="ABC Traders"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                    PAN
                  </label>
                  <input
                    type="text"
                    className="input w-full uppercase"
                    placeholder="ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                  ENTITY TYPE
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Private Limited / Partnership / Proprietorship"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                    SIGNATORY NAME
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Authorized person name"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                    SIGNATORY DESIGNATION
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Director / Partner"
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                  SIGNATORY CONTACT
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Email or phone number"
                  value={signatoryContact}
                  onChange={(e) => setSignatoryContact(e.target.value)}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                  REGISTERED ADDRESS
                </label>
                <textarea
                  className="input w-full min-h-[52px]"
                  placeholder="Full address"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                    STATE
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                    PINCODE
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wide mb-0.5">
                  NOTES
                </label>
                <textarea
                  className="input w-full min-h-[52px]"
                  placeholder="Additional notes about client..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full max-w-sm bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold py-2 px-6 rounded-md text-sm shadow transition-colors disabled:opacity-50"
            >
              {loading ? "Onboarding Client..." : "Onboard Client"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}