import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { base64File, mimeType } = await req.json();
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Extract client onboarding details from this document (GST Certificate, Aadhaar Card, PAN, or Partnership Deed). 
    Return strictly valid JSON without markdown wrapping:
    {
      "client_name": string | null,
      "trade_name": string | null,
      "gstin": string | null,
      "pan": string | null,
      "aadhaar_number": string | null,
      "constitution_of_business": string | null,
      "registered_address": string | null,
      "authorized_signatory": string | null
    }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64File, mimeType } }
    ]);

    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(responseText);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});