import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import crypto from "node:crypto";

Deno.serve(async (req) => {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

  if (!secret) {
    // Fail closed: never fall back to a hardcoded default secret, since
    // that would let anyone who reads the public source code forge webhook
    // calls and grant themselves a paid plan for free.
    console.error("RAZORPAY_WEBHOOK_SECRET is not set.");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("x-razorpay-signature");
  const bodyText = await req.text();
  const expectedSignature = crypto.createHmac("sha256", secret).update(bodyText).digest("hex");

  if (!signature || signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(bodyText);
  const event = payload.event;

  if (event === "subscription.charged" || event === "subscription.authenticated") {
    const notes = payload.payload.subscription.entity.notes;
    const userId = notes?.user_id;
    const planCode = notes?.plan_code;

    if (userId && planCode) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error } = await supabase.from("profiles").update({ plan: planCode }).eq("id", userId);
      if (error) {
        console.error("Failed to update profile plan:", error);
      }
    } else {
      console.error("Webhook event missing user_id or plan_code in notes:", notes);
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
});
