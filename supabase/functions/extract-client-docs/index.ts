import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Max file size accepted, matching the 10MB limit shown in the Onboard
// Client UI. Base64 inflates size by ~33%, so we check the decoded length.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);

// "gemini-flash-latest" is Google's rolling alias for their current
// recommended flash model — it re-points automatically as dated model IDs
// retire (gemini-2.5-flash is scheduled to retire Oct 2026), avoiding the
// exact "model does not exist" failure class that hardcoding a dated model
// name causes. This matches the pattern already used in api/index.js.
const GEMINI_MODEL = "gemini-flash-latest";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  let payload: { base64File?: string; mimeType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { base64File, mimeType } = payload;

  if (!base64File) {
    return json({ error: "Missing base64File payload." }, 400);
  }

  const resolvedMimeType = mimeType || "application/pdf";
  if (!ALLOWED_MIME_TYPES.has(resolvedMimeType)) {
    return json(
      { error: `Unsupported file type "${resolvedMimeType}". Please upload a PDF, PNG, or JPG.` },
      400
    );
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("extract-client-docs: GEMINI_API_KEY is not configured.");
    return json(
      { error: "Document parsing isn't configured yet on the server. Please fill the details manually." },
      500
    );
  }

  // Strip a Data URL prefix if the caller sent the full "data:...;base64,"
  // string rather than just the base64 payload.
  const cleanBase64 = base64File.includes(",") ? base64File.split(",")[1] : base64File;

  // Rough decoded-size check before spending a Gemini call on an oversized file.
  const approxDecodedBytes = Math.floor((cleanBase64.length * 3) / 4);
  if (approxDecodedBytes > MAX_FILE_BYTES) {
    return json({ error: "File is larger than the 10MB limit." }, 400);
  }

  const prompt = `Extract client onboarding details from this document (GST Certificate, Identity Document, PAN, or Partnership Deed).
Return strictly valid JSON, with no markdown code fences and no text before or after the JSON object, in exactly this shape:
{
  "legal_name": string | null,
  "trade_name": string | null,
  "pan": string | null,
  "entity_type": string | null,
  "registered_address": string | null,
  "state": string | null,
  "pincode": string | null,
  "signatory_name": string | null
}
If a field cannot be confidently determined from the document, use null rather than guessing.`;

  let result;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    result = await model.generateContent([
      prompt,
      { inlineData: { data: cleanBase64, mimeType: resolvedMimeType } },
    ]);
  } catch (err: any) {
    console.error("extract-client-docs: Gemini request failed:", err);
    return json(
      { error: "Could not reach the document parsing service. Please try again or fill the details manually." },
      502
    );
  }

  let responseText: string;
  try {
    responseText = result.response.text();
  } catch (err: any) {
    // Happens e.g. when Gemini blocks the response (safety filters) and
    // there is no text candidate to read.
    console.error("extract-client-docs: no readable response text:", err, JSON.stringify(result?.response));
    return json(
      { error: "The document could not be read. Please try a clearer scan or fill the details manually." },
      502
    );
  }

  // Be tolerant of stray markdown fences or leading/trailing prose, and pull
  // out just the JSON object rather than assuming the whole string parses.
  const withoutFences = responseText.replace(/```json|```/g, "").trim();
  const jsonMatch = withoutFences.match(/\{[\s\S]*\}/);
  const candidateJson = jsonMatch ? jsonMatch[0] : withoutFences;

  let parsedData: Record<string, unknown>;
  try {
    parsedData = JSON.parse(candidateJson);
  } catch (err) {
    console.error("extract-client-docs: failed to parse model output as JSON:", responseText);
    return json(
      { error: "Could not extract structured details from this document. Please fill the details manually." },
      502
    );
  }

  return json(parsedData, 200);
});
