import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import crypto from "node:crypto";

Deno.serve(async (req) => {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "super_secret_webhook_key";
  const signature = req.headers.get("x-razorpay-signature");

  const bodyText = await req.text();
  const expectedSignature = crypto.createHmac("sha256", secret).update(bodyText).digest("hex");

  if (signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(bodyText);
  const event = payload.event;

  if (event === "subscription.charged" || event === "subscription.authenticated") {
    const notes = payload.payload.subscription.entity.notes;
    const userId = notes.user_id;
    const planCode = notes.plan_code;

    if (userId && planCode) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabase.from("profiles").update({ plan: planCode }).eq("id", userId);
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
});