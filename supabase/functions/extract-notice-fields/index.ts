import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const EXTRACTION_SYSTEM_PROMPT = `You are extracting structured data from an Indian GST/Income-Tax notice.
Return ONLY valid JSON, no prose, no markdown formatting, no code fences.

Extract exactly this schema:
{
  "notice_type": string,              // e.g. "ASMT-10", "DRC-01", "SCN"
  "notice_ref_no": string | null,
  "notice_date": string | null,       // ISO format YYYY-MM-DD
  "period_from": string | null,
  "period_to": string | null,
  "fy": string | null,
  "gstin_mentioned": string | null,
  "issuing_office_name": string | null,
  "issuing_office_address": string | null,
  "ward_circle_range": string | null,
  "discrepancy_type": string | null,  // e.g. "ITC mismatch GSTR-2B vs 3B"
  "discrepancy_details": string | null,
  "confidence_notes": string          // flag anything unclear/illegible
}

If a field is not found in the document, use null. Never fabricate values.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Missing pdfBase64 payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Anthropic API with document block support
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        temperature: 0,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: "Extract all relevant notice information into the specified JSON format.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API Error: ${errText}`);
    }

    const claudeData = await response.json();
    const rawText = claudeData.content[0].text;

    // Clean backticks or stray text if model adds them
    const cleanJsonString = rawText.replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(cleanJsonString);

    return new Response(JSON.stringify({ success: true, data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});