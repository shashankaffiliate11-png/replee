import React, { useState } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";
import { convertPdfToBase64 } from "../lib/fileUtils";
import { useAuth } from "../context/AuthContext";

interface ClientForm {
  legal_name: string;
  trade_name: string;
  pan: string;
  entity_type: string;
  registered_address: string;
  state: string;
  pincode: string;
  signatory_name: string;
  signatory_designation: string;
  signatory_contact: string;
  notes: string;
}

export default function OnboardClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<ClientForm>({
    legal_name: "",
    trade_name: "",
    pan: "",
    entity_type: "",
    registered_address: "",
    state: "",
    pincode: "",
    signatory_name: "",
    signatory_designation: "",
    signatory_contact: "",
    notes: "",
  });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const base64 = await convertPdfToBase64(file);
      
      const { data, error: fnError } = await supabase.functions.invoke("extract-client-docs", {
        body: { base64File: base64, mimeType: file.type },
      });

      if (fnError) {
        console.error("Supabase Function Error Object:", fnError);
        throw new Error(fnError.message || "Failed to communicate with extraction function.");
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      if (data) {
        setFormData((prev) => ({
          ...prev,
          legal_name: data.legal_name || prev.legal_name,
          trade_name: data.trade_name || prev.trade_name,
          pan: data.pan || prev.pan,
          entity_type: data.entity_type || prev.entity_type,
          registered_address: data.registered_address || prev.registered_address,
          state: data.state || prev.state,
          pincode: data.pincode || prev.pincode,
          signatory_name: data.signatory_name || prev.signatory_name,
        }));
        setSuccessMessage("Document extracted! Review details on the right.");
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "Could not extract details automatically. Please enter details manually.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClientForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const { error: dbError } = await (supabase.from("clients" as any) as any).insert({
      firm_id: user.id,
      legal_name: formData.legal_name,
      trade_name: formData.trade_name || null,
      pan: formData.pan || null,
      entity_type: formData.entity_type || null,
      registered_address: formData.registered_address || null,
      state: formData.state || null,
      pincode: formData.pincode || null,
      signatory_name: formData.signatory_name || null,
      signatory_designation: formData.signatory_designation || null,
      signatory_contact: formData.signatory_contact || null,
      notes: formData.notes || null,
    });

    setSaving(false);

    if (dbError) {
      console.error("Database save error:", dbError);
      setError("Failed to save client details. Please try again.");
    } else {
      setSuccessMessage("Client onboarded successfully!");
      setFormData({
        legal_name: "",
        trade_name: "",
        pan: "",
        entity_type: "",
        registered_address: "",
        state: "",
        pincode: "",
        signatory_name: "",
        signatory_designation: "",
        signatory_contact: "",
        notes: "",
      });
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-ink-950 mb-1">Onboard Client</h1>
      <p className="text-sm text-ink-600 mb-6">
        Upload onboarding documents (GST, Partnership Deed, PAN, etc.) to auto-populate client fields.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Upload Section */}
        <div className="border border-paper-line bg-white p-6 rounded-lg shadow-sm h-fit">
          <h2 className="text-lg font-medium text-ink-900 mb-2">Upload Document</h2>
          <p className="text-xs text-ink-500 mb-6">
            Supported formats: PDF, PNG, JPG (up to 10MB)
          </p>

          <div className="border-2 border-dashed border-paper-line p-8 text-center rounded-md bg-paper-dim">
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={handleDocumentUpload}
              className="hidden"
              id="doc-upload"
            />
            <label
              htmlFor="doc-upload"
              className="cursor-pointer font-medium text-sm text-ink-950 underline hover:text-ink-700"
            >
              Click to select or drop document here
            </label>
          </div>

          {loading && (
            <p className="mt-4 text-xs font-medium text-ink-700">
              Extracting client details via Gemini AI...
            </p>
          )}

          {error && (
            <p className="mt-4 text-xs font-medium text-warn break-words">
              {error}
            </p>
          )}

          {successMessage && !loading && (
            <p className="mt-4 text-xs font-medium text-emerald-600">
              {successMessage}
            </p>
          )}
        </div>

        {/* Right Column: Client Form */}
        <div className="border border-paper-line bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium text-ink-900 mb-4">Client Details</h2>
          <form className="space-y-4" onSubmit={handleSaveClient}>
            <div>
              <label className="field-label">Legal Name *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="ABC Traders Pvt Ltd"
                value={formData.legal_name}
                onChange={(e) => handleInputChange("legal_name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Trade Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ABC Traders"
                  value={formData.trade_name}
                  onChange={(e) => handleInputChange("trade_name", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">PAN</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ABCDE1234F"
                  value={formData.pan}
                  onChange={(e) => handleInputChange("pan", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Entity Type</label>
              <input
                type="text"
                className="input"
                placeholder="Private Limited / Partnership / Proprietorship"
                value={formData.entity_type}
                onChange={(e) => handleInputChange("entity_type", e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Registered Address</label>
              <textarea
                className="input min-h-[70px]"
                placeholder="Full address"
                value={formData.registered_address}
                onChange={(e) => handleInputChange("registered_address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">State</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Maharashtra"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Pincode</label>
                <input
                  type="text"
                  className="input"
                  placeholder="400001"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Signatory Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Authorized person name"
                  value={formData.signatory_name}
                  onChange={(e) => handleInputChange("signatory_name", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Signatory Designation</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Director / Partner"
                  value={formData.signatory_designation}
                  onChange={(e) => handleInputChange("signatory_designation", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Signatory Contact</label>
              <input
                type="text"
                className="input"
                placeholder="Email or phone number"
                value={formData.signatory_contact}
                onChange={(e) => handleInputChange("signatory_contact", e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Notes</label>
              <textarea
                className="input min-h-[60px]"
                placeholder="Additional notes about client..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
              {saving ? "Saving Client…" : "Save Client"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}