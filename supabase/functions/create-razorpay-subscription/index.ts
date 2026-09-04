import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
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

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    // Plan IDs now come from secrets, not hardcoded in the file. This means
    // updating a plan ID never requires a redeploy — just `supabase secrets set`.
    const RAZORPAY_PLAN_IDS: Record<string, string | undefined> = {
      starter: Deno.env.get("RAZORPAY_PLAN_STARTER"),
      professional: Deno.env.get("RAZORPAY_PLAN_PROFESSIONAL"),
    };

    if (!keyId || !keySecret) {
      console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET secret.");
      return new Response(
        JSON.stringify({ error: "Payments are not configured yet. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth validation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please sign out and sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan } = await req.json();
    const razorpayPlanId = RAZORPAY_PLAN_IDS[plan];

    if (!razorpayPlanId) {
      console.error(`No RAZORPAY_PLAN_${plan.toUpperCase()} secret set for plan: ${plan}`);
      return new Response(
        JSON.stringify({ error: `This plan isn't configured yet. Please contact support.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    console.error("Unexpected error in create-razorpay-subscription:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
