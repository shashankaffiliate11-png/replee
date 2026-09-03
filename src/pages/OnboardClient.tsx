import React, { useState } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";
import { convertPdfToBase64 } from "../lib/fileUtils";

interface ClientForm {
  client_name: string;
  trade_name: string;
  gstin: string;
  pan: string;
  aadhaar_number: string;
  constitution_of_business: string;
  registered_address: string;
  authorized_signatory: string;
}

export default function OnboardClient() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClientForm>({
    client_name: "",
    trade_name: "",
    gstin: "",
    pan: "",
    aadhaar_number: "",
    constitution_of_business: "",
    registered_address: "",
    authorized_signatory: "",
  });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const base64 = await convertPdfToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-client-docs", {
        body: { base64File: base64, mimeType: file.type },
      });

      if (error) throw error;

      if (data) {
        setFormData((prev) => ({
          ...prev,
          client_name: data.client_name || prev.client_name,
          trade_name: data.trade_name || prev.trade_name,
          gstin: data.gstin || prev.gstin,
          pan: data.pan || prev.pan,
          aadhaar_number: data.aadhaar_number || prev.aadhaar_number,
          constitution_of_business: data.constitution_of_business || prev.constitution_of_business,
          registered_address: data.registered_address || prev.registered_address,
          authorized_signatory: data.authorized_signatory || prev.authorized_signatory,
        }));
      }
    } catch (err) {
      console.error("Extraction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClientForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Document Upload Section */}
        <div className="border p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Upload Client Documents</h2>
          <p className="text-sm text-gray-600 mb-6">
            Upload GST Registration, Aadhaar Card, or Partnership Deed to auto-extract details via OCR.
          </p>

          <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded-md bg-gray-50">
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={handleDocumentUpload}
              className="hidden"
              id="doc-upload"
            />
            <label htmlFor="doc-upload" className="cursor-pointer text-indigo-600 font-medium">
              Click to upload document
            </label>
            <p className="text-xs text-gray-500 mt-1">PDF, PNG, or JPG up to 10MB</p>
          </div>

          {loading && <p className="mt-4 text-sm text-indigo-600 font-medium">Extracting document details...</p>}
        </div>

        {/* Right Column: Auto-populated Client Form */}
        <div className="border p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Client Details</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Legal Name / Client Name</label>
              <input
                type="text"
                className="input w-full border rounded p-2 text-sm mt-1"
                value={formData.client_name}
                onChange={(e) => handleInputChange("client_name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Trade Name</label>
                <input
                  type="text"
                  className="input w-full border rounded p-2 text-sm mt-1"
                  value={formData.trade_name}
                  onChange={(e) => handleInputChange("trade_name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">GSTIN</label>
                <input
                  type="text"
                  className="input w-full border rounded p-2 text-sm mt-1"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange("gstin", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">PAN</label>
                <input
                  type="text"
                  className="input w-full border rounded p-2 text-sm mt-1"
                  value={formData.pan}
                  onChange={(e) => handleInputChange("pan", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Aadhaar Number</label>
                <input
                  type="text"
                  className="input w-full border rounded p-2 text-sm mt-1"
                  value={formData.aadhaar_number}
                  onChange={(e) => handleInputChange("aadhaar_number", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Constitution of Business</label>
              <input
                type="text"
                className="input w-full border rounded p-2 text-sm mt-1"
                value={formData.constitution_of_business}
                onChange={(e) => handleInputChange("constitution_of_business", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Registered Address</label>
              <textarea
                className="input w-full border rounded p-2 text-sm mt-1 min-h-[80px]"
                value={formData.registered_address}
                onChange={(e) => handleInputChange("registered_address", e.target.value)}
              />
            </div>

            <button type="button" className="btn-primary w-full py-2 bg-black text-white rounded">
              Save Client
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}