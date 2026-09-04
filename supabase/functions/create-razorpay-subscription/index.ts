import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map your plan codes to actual Razorpay Plan IDs created in your Razorpay Dashboard
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  starter: "plan_TY0FgepH0ZJYnG",      // Replace with your real Plan ID from Razorpay
  professional: "plan_TY0HeXe1xuUcfB", // Replace with your real Plan ID from Razorpay
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    // Create Supabase client using the caller's Auth JWT token
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Authenticate user via JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth validation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please log out and log back in." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan } = await req.json();
    const razorpayPlanId = RAZORPAY_PLAN_IDS[plan];

    if (!razorpayPlanId || razorpayPlanId.includes("Pxxxxxxxxxxxx")) {
      return new Response(
        JSON.stringify({ error: `Invalid or unconfigured plan selected: ${plan}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Request Razorpay API to create subscription
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
        notes: {
          user_id: user.id,
          plan_code: plan,
        },
      }),
    });

    const subscription = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error("Razorpay API error:", subscription);
      return new Response(
        JSON.stringify({ error: subscription.error?.description || "Razorpay subscription creation failed." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        razorpay_key_id: keyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unexpected function execution error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});