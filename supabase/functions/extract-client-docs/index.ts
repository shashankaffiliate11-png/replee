import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { base64File, mimeType } = await req.json();

    if (!base64File) {
      return new Response(
        JSON.stringify({ error: "Missing base64File payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase environment secrets." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Strip prefix if full Data URL was passed (e.g. data:application/pdf;base64,...)
    const cleanBase64 = base64File.includes(",") ? base64File.split(",")[1] : base64File;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Extract client onboarding details from this document (GST Certificate, Identity Document, PAN, or Partnership Deed). 
    Return strictly valid JSON without markdown wrapping:
    {
      "legal_name": string | null,
      "trade_name": string | null,
      "pan": string | null,
      "entity_type": string | null,
      "registered_address": string | null,
      "state": string | null,
      "pincode": string | null,
      "signatory_name": string | null
    }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: cleanBase64, mimeType: mimeType || "application/pdf" } },
    ]);

    const rawText = result.response.text().replace(/```json|```/g, "").trim();
    const parsedData = JSON.parse(rawText);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge function processing error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process document via Gemini AI" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});