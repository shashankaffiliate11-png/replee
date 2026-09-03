// Supabase Edge Function: create-razorpay-subscription
//
// Called from src/pages/PricingPage.tsx when a signed-in user picks a paid
// plan. Creates a Razorpay subscription server-side (so RAZORPAY_KEY_SECRET
// never reaches the browser) and returns just the subscription id + the
// public Key ID, which the frontend needs to open Razorpay's Checkout widget.
//
// The actual plan flip (profiles.plan = 'starter' etc.) does NOT happen
// here — it happens in razorpay-webhook/index.ts once Razorpay confirms
// the payment. This function only starts the subscription.
//
// Deploy with:
//   npx supabase functions deploy create-razorpay-subscription
// Set secrets with:
//   npx supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx
//   npx supabase secrets set RAZORPAY_PLAN_STARTER=plan_xxx RAZORPAY_PLAN_PROFESSIONAL=plan_yyy
//
// (RAZORPAY_PLAN_STARTER / RAZORPAY_PLAN_PROFESSIONAL are the Plan IDs you
// create in the Razorpay Dashboard → Subscriptions → Plans — one per paid
// tier. See README.md section 8 for the full walkthrough.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PLAN_ID_ENV_MAP: Record<string, string> = {
  starter: "RAZORPAY_PLAN_STARTER",
  professional: "RAZORPAY_PLAN_PROFESSIONAL",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const body = await req.json().catch(() => null);
  const planCode = body?.plan as string | undefined;

  if (!planCode || !PLAN_ID_ENV_MAP[planCode]) {
    return json({ error: "Unknown or unsupported plan. Use 'starter' or 'professional'." }, 400);
  }

  const razorpayPlanId = Deno.env.get(PLAN_ID_ENV_MAP[planCode]);
  if (!razorpayPlanId) {
    return json(
      {
        error: `${PLAN_ID_ENV_MAP[planCode]} is not configured. Set it with 'supabase secrets set' once you've created the plan in Razorpay.`,
      },
      500
    );
  }

  // Razorpay's Subscriptions API uses HTTP Basic Auth with your Key ID/Secret.
  const authToken = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

  const razorpayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`,
    },
    body: JSON.stringify({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      // 120 monthly cycles ≈ 10 years, effectively "until cancelled" —
      // Razorpay subscriptions require a total_count, there's no literal
      // "forever" option.
      total_count: 120,
      notes: {
        // The webhook handler reads this to know which Supabase user to
        // update once payment is confirmed — without it, a successful
        // Razorpay payment would have no way to map back to a user.
        supabase_user_id: user.id,
      },
    }),
  });

  if (!razorpayRes.ok) {
    const errText = await razorpayRes.text();
    console.error("Razorpay subscription creation failed:", errText);
    return json({ error: "Could not start checkout. Please try again." }, 502);
  }

  const subscription = await razorpayRes.json();

  return json({
    subscription_id: subscription.id,
    razorpay_key_id: razorpayKeyId,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
