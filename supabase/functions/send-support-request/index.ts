// Supabase Edge Function: send-support-request
//
// Called from src/components/ContactSupportModal.tsx via
// supabase.functions.invoke("send-support-request").
//
// Sends the Contact Support form to shashankaffiliate11@gmail.com using
// Resend (https://resend.com) — a simple transactional email API. Resend's
// free tier (no credit card) covers this comfortably.
//
// Setup required before this works:
//   1. Create a free account at https://resend.com
//   2. Get an API key from the Resend dashboard
//   3. Set it as a Supabase secret:
//        npx supabase secrets set RESEND_API_KEY=re_your_key_here
//   4. (Optional but recommended for production) Verify your own domain in
//      Resend and change SUPPORT_FROM_ADDRESS below to an address on that
//      domain, e.g. "NoticeDesk Support <support@yourdomain.com>". Until
//      you verify a domain, Resend's shared "onboarding@resend.dev" sender
//      works fine for low volume.
//
// Deploy with:
//   npx supabase functions deploy send-support-request

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten to your Vercel domain in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORT_TO_ADDRESS = "shashankaffiliate11@gmail.com";
const SUPPORT_FROM_ADDRESS = "NoticeDesk Support <onboarding@resend.dev>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    return json({ error: "Support email is not configured yet (missing RESEND_API_KEY)." }, 500);
  }

  // Confirm the request comes from a signed-in user (basic spam prevention).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim();
  const mobile = (body?.mobile ?? "").toString().trim();
  const message = (body?.message ?? "").toString().trim();

  if (!name || !email || !message) {
    return json({ error: "Name, email, and message are required." }, 400);
  }

  const emailBody = `New support request from NoticeDesk

Name: ${name}
Email: ${email}
Mobile: ${mobile || "not provided"}

Message:
${message}
`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: SUPPORT_FROM_ADDRESS,
      to: [SUPPORT_TO_ADDRESS],
      reply_to: email,
      subject: `NoticeDesk support request from ${name}`,
      text: emailBody,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend API error:", errText);
    return json({ error: "Could not send your message. Please try again." }, 502);
  }

  return json({ success: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
