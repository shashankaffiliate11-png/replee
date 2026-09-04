import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map plan codes to Razorpay Plan IDs (Created in Razorpay Dashboard)
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  starter: "plan_Pxxxxxxxxxxxx1",      // Replace with your actual Plan ID from Razorpay
  professional: "plan_Pxxxxxxxxxxxx2", // Replace with your actual Plan ID from Razorpay
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { plan } = await req.json();
    const razorpayPlanId = RAZORPAY_PLAN_IDS[plan];

    if (!razorpayPlanId) {
      return new Response(JSON.stringify({ error: "Invalid plan selected" }), { status: 400, headers: corsHeaders });
    }

    // Call Razorpay API to create a subscription
    const auth = btoa(`${keyId}:${keySecret}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: { user_id: user.id, plan_code: plan },
      }),
    });

    const subscription = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay error:", subscription);
      return new Response(JSON.stringify({ error: subscription.error?.description || "Subscription creation failed" }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        razorpay_key_id: keyId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});