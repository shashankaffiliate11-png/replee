// Supabase Edge Function: razorpay-webhook
//
// Receives subscription lifecycle events from Razorpay (India's standard
// payment gateway for INR subscriptions) and updates the subscriptions /
// profiles tables accordingly.
//
// THIS IS A STARTING POINT, NOT A FINISHED INTEGRATION. Wiring up real
// billing requires:
//   1. A Razorpay account with a Plan created for each paid tier (Starter,
//      Professional) — see https://razorpay.com/docs/payments/subscriptions/
//   2. A checkout flow in the app (Settings.tsx currently just links to
//      /pricing — you'd replace "Choose plan" with a call to create a
//      Razorpay subscription and open their checkout widget).
//   3. This webhook URL registered in the Razorpay dashboard, with the
//      signing secret set below.
//
// Deploy with:
//   npx supabase functions deploy razorpay-webhook --no-verify-jwt
// Set secrets with:
//   npx supabase secrets set RAZORPAY_WEBHOOK_SECRET=whsec_...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  const signature = req.headers.get("x-razorpay-signature");
  const rawBody = await req.text();
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

  const valid = await verifySignature(rawBody, signature, webhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Map your Razorpay plan IDs to internal plan codes here.
  const RAZORPAY_PLAN_MAP: Record<string, "starter" | "professional"> = {
    // "plan_XXXXXXXXXXXX": "starter",
    // "plan_YYYYYYYYYYYY": "professional",
  };

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged": {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.supabase_user_id; // set this note when creating the subscription
      const internalPlan = RAZORPAY_PLAN_MAP[sub.plan_id];

      if (userId && internalPlan) {
        await admin.from("subscriptions").upsert({
          user_id: userId,
          plan: internalPlan,
          razorpay_subscription_id: sub.id,
          status: "active",
          current_period_end: new Date(sub.current_end * 1000).toISOString(),
        });
        await admin.from("profiles").update({ plan: internalPlan }).eq("id", userId);
      }
      break;
    }
    case "subscription.cancelled":
    case "subscription.completed": {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.supabase_user_id;
      if (userId) {
        await admin
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("razorpay_subscription_id", sub.id);
        await admin.from("profiles").update({ plan: "free_trial" }).eq("id", userId);
      }
      break;
    }
    default:
      // Ignore other event types.
      break;
  }

  return new Response("ok", { status: 200 });
});

async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}
