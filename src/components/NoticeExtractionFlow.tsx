"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient"; // Your Supabase browser client
import { convertPdfToBase64 } from "../lib/fileUtils";
import { ExtractedNotice, FlowStep } from "../types/notice";

interface Props {
  onProceedToDraft: (confirmedData: ExtractedNotice) => void;
}

export default function NoticeExtractionFlow({ onProceedToDraft }: Props) {
  const [step, setStep] = useState<FlowStep>("UPLOAD");
  const [extractedData, setExtractedData] = useState<ExtractedNotice | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // 1. Handle File Selection & Trigger Extraction
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setFileName(file.name);
    setStep("EXTRACTING");

    try {
      const pdfBase64 = await convertPdfToBase64(file);

      // Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        "extract-notice-fields",
        {
          body: { pdfBase64 },
        },
      );

      if (error) {
        throw new Error(
          error.message || "Failed to parse edge function response.",
        );
      }

      if (!data?.success || !data?.data) {
        throw new Error(
          data?.error || "AI failed to extract fields from this document.",
        );
      }

      setExtractedData(data.data as ExtractedNotice);
      setStep("CONFIRM_EDIT");
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred during extraction.",
      );
      setStep("UPLOAD");
    }
  };

  // 2. Controlled Input Handler for Form Fields
  const handleFieldChange = (key: keyof ExtractedNotice, value: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [key]: value === "" ? null : value,
    });
  };

  // 3. Confirm and Submit to Step B (Drafting Flow)
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedData) return;
    setStep("PROCEED_TO_DRAFT");
    onProceedToDraft(extractedData);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      {/* HEADER */}
      <div className="mb-6 border-b pb-4">
        <h1 className="text-xl font-bold text-gray-900">
          Step A: Notice Parsing
        </h1>
        <p className="text-sm text-gray-500">
          Upload a GST/Income Tax Notice PDF to extract structured data for
          drafting.
        </p>
      </div>

      {/* ERROR DISPLAY */}
      {errorMessage && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* STATE 1: FILE UPLOAD DROPZONE */}
      {step === "UPLOAD" && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors bg-gray-50">
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <label
            htmlFor="file-upload"
            className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
          >
            Click to upload PDF
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1">PDF up to 8MB</p>
        </div>
      )}

      {/* STATE 2: EXTRACTION IN PROGRESS */}
      {step === "EXTRACTING" && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-base font-semibold text-gray-800">
            Reading and parsing document...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Extracting dates, references, and discrepancy details from{" "}
            {fileName}
          </p>
        </div>
      )}

      {/* STATE 3: CONFIRMATION & EDIT FORM */}
      {step === "CONFIRM_EDIT" && extractedData && (
        <form onSubmit={handleFinalSubmit} className="space-y-5">
          {/* AI Confidence / Audit Notes Alert */}
          {extractedData.confidence_notes && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="font-semibold text-amber-800 text-xs uppercase tracking-wide">
                AI Extraction Notes:
              </span>
              <p className="text-sm text-amber-900 mt-0.5">
                {extractedData.confidence_notes}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notice Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notice Type
              </label>
              <input
                type="text"
                value={extractedData.notice_type || ""}
                onChange={(e) =>
                  handleFieldChange("notice_type", e.target.value)
                }
                placeholder="e.g. ASMT-10, DRC-01"
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Ref No */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={extractedData.notice_ref_no || ""}
                onChange={(e) =>
                  handleFieldChange("notice_ref_no", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notice Date
              </label>
              <input
                type="date"
                value={extractedData.notice_date || ""}
                onChange={(e) =>
                  handleFieldChange("notice_date", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Financial Year */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Financial Year (FY)
              </label>
              <input
                type="text"
                value={extractedData.fy || ""}
                onChange={(e) => handleFieldChange("fy", e.target.value)}
                placeholder="e.g. 2021-22"
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Period From & To */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Period From
              </label>
              <input
                type="date"
                value={extractedData.period_from || ""}
                onChange={(e) =>
                  handleFieldChange("period_from", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Period To
              </label>
              <input
                type="date"
                value={extractedData.period_to || ""}
                onChange={(e) => handleFieldChange("period_to", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                GSTIN Mentioned
              </label>
              <input
                type="text"
                value={extractedData.gstin_mentioned || ""}
                onChange={(e) =>
                  handleFieldChange("gstin_mentioned", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Ward / Circle / Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ward / Circle / Range
              </label>
              <input
                type="text"
                value={extractedData.ward_circle_range || ""}
                onChange={(e) =>
                  handleFieldChange("ward_circle_range", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Full Width Text Fields */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Issuing Office Name
            </label>
            <input
              type="text"
              value={extractedData.issuing_office_name || ""}
              onChange={(e) =>
                handleFieldChange("issuing_office_name", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Discrepancy Summary
            </label>
            <input
              type="text"
              value={extractedData.discrepancy_type || ""}
              onChange={(e) =>
                handleFieldChange("discrepancy_type", e.target.value)
              }
              placeholder="e.g. ITC mismatch GSTR-2B vs 3B"
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Discrepancy Details
            </label>
            <textarea
              rows={3}
              value={extractedData.discrepancy_details || ""}
              onChange={(e) =>
                handleFieldChange("discrepancy_details", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-4 flex justify-between items-center border-t">
            <button
              type="button"
              onClick={() => setStep("UPLOAD")}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Re-upload PDF
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
            >
              Confirm & Generate Reply Draft →
            </button>
          </div>
        </form>
      )}

      {/* STATE 4: SUCCESS / TRANSITION */}
      {step === "PROCEED_TO_DRAFT" && (
        <div className="py-8 text-center text-green-600 font-medium">
          ✓ Notice data confirmed. Initializing drafting engine...
        </div>
      )}
    </div>
  );
}
