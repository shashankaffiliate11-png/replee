// Supabase Edge Function: draft-notice
//
// Called from src/pages/NewNotice.tsx via supabase.functions.invoke("draft-notice").
// Runs server-side so the GEMINI_API_KEY never reaches the browser, and so
// plan-limit checks can't be bypassed by a client tampering with the request.
//
// Uses Google's Gemini API (generativelanguage.googleapis.com) on the free
// tier. Accepts EITHER:
//   - notice_file_path: a path in the "notice-uploads" storage bucket
//     (the actual PDF/scanned image of the notice, read natively by Gemini)
//   - original_notice_text: pasted plain text of the notice
// If both are absent, the request is rejected.
//
// Deploy via the Supabase Dashboard (Edge Functions → draft-notice → paste
// this file → Deploy updates), or via CLI:
//   npx supabase functions deploy draft-notice
// Set the secret with:
//   npx supabase secrets set GEMINI_API_KEY=AIza...
// (or add it under Edge Functions → Secrets in the dashboard)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PLAN_LIMITS: Record<string, number | "unlimited"> = {
  free_trial: 3,
  starter: 15,
  professional: "unlimited",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are drafting a formal written response to an Indian GST or Income Tax
department notice, for a practicing Chartered Accountant to review, edit, and
file on behalf of their client.

The notice will be provided either as pasted text, or as an attached PDF or
photo of the actual notice — in the latter case, read the document directly;
it may be a scan, so some parts (stamps, signatures, faint text) may not be
perfectly legible. Extract what you can and flag anything illegible.

Respond in exactly this format, with both section headers present and
nothing before the first header:

NOTICE_SUMMARY:
A plain 2-4 line summary of what the notice says: the notice type, the
issue raised, the amount/period involved if stated, and the deadline if
stated. Write this as if briefing the CA before they read the draft below.

DRAFT_RESPONSE:
The formal response itself, structured as: (1) reference line citing the
notice number/date/section, (2) a brief acknowledgment, (3) numbered
submissions addressing each point raised in the notice using the case facts
provided, (4) a closing paragraph requesting the notice be disposed of /
dropped, as appropriate, (5) a line noting enclosures if the case facts
mention any supporting documents.

Rules for the draft response:
- Write in the register used in real submissions to Indian tax authorities:
  formal, numbered paragraphs, precise, no filler.
- Use only the facts given (from the notice itself and the case facts
  provided). Do NOT invent figures, dates, section numbers, or precedents
  that were not provided. If a fact needed to make the response complete is
  missing, add a clearly marked placeholder like
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
  const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

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

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => null);
  if (!body || !body.client_name || !body.notice_type) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (!body.notice_file_path && !body.original_notice_text) {
    return json({ error: "Attach the notice file, or paste the notice text." }, 400);
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

  // ── 2. Build the Gemini "parts" array ────────────────────────────────
  // Gemini's inline_data part is the equivalent of Claude's document/image
  // content block — same idea (base64 file bytes + a mime type), different
  // field names.
  const parts: unknown[] = [];

  if (body.notice_file_path) {
    if (!String(body.notice_file_path).startsWith(`${user.id}/`)) {
      return json({ error: "Invalid file reference." }, 403);
    }

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("notice-uploads")
      .download(body.notice_file_path);

    if (downloadError || !fileBlob) {
      console.error("Storage download error:", downloadError);
      return json({ error: "Could not read the uploaded file. Please try uploading it again." }, 500);
    }

    const extension = String(body.notice_file_path).split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME_BY_EXTENSION[extension];
    if (!mimeType) {
      return json({ error: "Unsupported file type. Upload a PDF, PNG, or JPG." }, 400);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
  }

  const textPrompt = `Notice type: ${body.notice_type}
Notice reference: ${body.notice_reference_no ?? "not provided"}
Client name: ${body.client_name}

${
  body.notice_file_path
    ? "The notice is attached above as a document. Read it directly."
    : `Full notice text:\n"""\n${body.original_notice_text}\n"""`
}

Case facts and submissions to include:
"""
${body.case_facts ?? "none provided — draft using only the notice"}
"""

Respond now in the NOTICE_SUMMARY / DRAFT_RESPONSE format described in your instructions.`;

  parts.push({ text: textPrompt });

  // ── 3. Call Gemini ───────────────────────────────────────────────────
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: 2500 },
      }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("Gemini API error:", errText);
    return json({ error: "Draft generation failed. Please try again." }, 502);
  }

  const geminiData = await geminiRes.json();
  const rawText = geminiData.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("\n")
    .trim();

  if (!rawText) {
    // Gemini returns no candidates if it refuses/blocks content — surface
    // that distinctly rather than a generic failure.
    const blockReason = geminiData.promptFeedback?.blockReason;
    return json(
      {
        error: blockReason
          ? `The draft was blocked by Gemini's safety filters (${blockReason}). Try rephrasing the case facts, or switch to a different notice.`
          : "Draft generation returned no content. Please try again.",
      },
      502
    );
  }

  const { summary, draft } = splitSummaryAndDraft(rawText);

  // ── 4. Save the notice and increment usage ──────────────────────────
  const { data: inserted, error: insertError } = await admin
    .from("notices")
    .insert({
      user_id: user.id,
      client_name: body.client_name,
      notice_type: body.notice_type,
      notice_reference_no: body.notice_reference_no ?? null,
      notice_file_path: body.notice_file_path ?? null,
      original_notice_text: body.notice_file_path ? summary : body.original_notice_text,
      ai_draft_response: draft,
      final_response: draft,
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

function splitSummaryAndDraft(raw: string): { summary: string; draft: string } {
  const summaryMatch = raw.match(/NOTICE_SUMMARY:\s*([\s\S]*?)\s*DRAFT_RESPONSE:/i);
  const draftMatch = raw.match(/DRAFT_RESPONSE:\s*([\s\S]*)/i);

  if (summaryMatch && draftMatch) {
    return { summary: summaryMatch[1].trim(), draft: draftMatch[1].trim() };
  }
  return { summary: "Notice summary unavailable — see draft below.", draft: raw };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
