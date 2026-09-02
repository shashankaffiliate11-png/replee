// Supabase Edge Function: draft-notice
//
// Called from src/pages/NewNotice.tsx via supabase.functions.invoke("draft-notice").
// Runs server-side so the ANTHROPIC_API_KEY never reaches the browser, and so
// plan-limit checks can't be bypassed by a client tampering with the request.
//
// Deploy with:
//   npx supabase functions deploy draft-notice
// Set secrets with:
//   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PLAN_LIMITS: Record<string, number | "unlimited"> = {
  free_trial: 3,
  starter: 15,
  professional: "unlimited",
};

const SYSTEM_PROMPT = `You are drafting a formal written response to an Indian GST or Income Tax
department notice, for a practicing Chartered Accountant to review, edit, and
file on behalf of their client.

Rules:
- Write in the register used in real submissions to Indian tax authorities:
  formal, numbered paragraphs, precise, no filler.
- Structure the response as: (1) reference line citing the notice number/date/
  section, (2) a brief acknowledgment, (3) numbered submissions addressing
  each point raised in the notice using the case facts provided, (4)
  a closing paragraph requesting the notice be disposed of / dropped, as
  appropriate, (5) a line noting enclosures if the case facts mention any
  supporting documents.
- Use only the facts given. Do NOT invent figures, dates, section numbers, or
  precedents that were not provided. If a fact needed to make the response
  complete is missing, add a clearly marked placeholder like
  "[CONFIRM: turnover figure for Q3]" rather than guessing.
- This is a DRAFT for professional review, not a final filing. Do not add
  disclaimers about this within the draft text itself — the product surfaces
  that separately.
- Do not fabricate case law citations unless they were supplied in the case
  facts.`;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  // Client scoped to the caller's JWT, used only to identify who is calling.
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

  // Service-role client for writes that must not be spoofable by the client
  // (usage counters, plan enforcement).
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => null);
  if (!body || !body.client_name || !body.notice_type || !body.original_notice_text) {
    return json({ error: "Missing required fields" }, 400);
  }

  // ── 1. Check plan limit ──────────────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan = profile?.plan ?? "free_trial";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free_trial;

  const periodMonth = new Date();
  periodMonth.setDate(1);
  const periodMonthStr = periodMonth.toISOString().slice(0, 10);

  const { data: usageRow } = await admin
    .from("usage_counters")
    .select("notices_used")
    .eq("user_id", user.id)
    .eq("period_month", periodMonthStr)
    .maybeSingle();

  const used = usageRow?.notices_used ?? 0;

  if (limit !== "unlimited" && used >= limit) {
    return json(
      {
        error: `You've used all ${limit} drafts on your ${plan.replace("_", " ")} plan this month. Upgrade to keep drafting.`,
      },
      403
    );
  }

  // ── 2. Call Claude to draft the response ────────────────────────────
  const userPrompt = `Notice type: ${body.notice_type}
Notice reference: ${body.notice_reference_no ?? "not provided"}
Client name: ${body.client_name}

Full notice text:
"""
${body.original_notice_text}
"""

Case facts and submissions to include:
"""
${body.case_facts ?? "none provided — draft using only the notice text"}
"""

Draft the response now.`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    console.error("Claude API error:", errText);
    return json({ error: "Draft generation failed. Please try again." }, 502);
  }

  const claudeData = await claudeRes.json();
  const draftText = claudeData.content
    ?.map((block: { type: string; text?: string }) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  if (!draftText) {
    return json({ error: "Draft generation returned no content. Please try again." }, 502);
  }

  // ── 3. Save the notice and increment usage ──────────────────────────
  const { data: inserted, error: insertError } = await admin
    .from("notices")
    .insert({
      user_id: user.id,
      client_name: body.client_name,
      notice_type: body.notice_type,
      notice_reference_no: body.notice_reference_no ?? null,
      original_notice_text: body.original_notice_text,
      ai_draft_response: draftText,
      final_response: draftText,
      status: "drafted",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Insert error:", insertError);
    return json({ error: "Draft generated but could not be saved. Please try again." }, 500);
  }

  await admin
    .from("usage_counters")
    .upsert(
      { user_id: user.id, period_month: periodMonthStr, notices_used: used + 1 },
      { onConflict: "user_id,period_month" }
    );

  return json({ notice_id: inserted.id });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
