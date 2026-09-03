import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are drafting a formal written response to an Indian GST or Income Tax
department notice, for a practicing Chartered Accountant to review, edit, and
file on behalf of their client.

The notice will be provided either as pasted text, or as an attached PDF or
photo of the actual notice — in the latter case, read the document directly.

Respond in exactly this format, with both section headers present and
nothing before the first header:

NOTICE_SUMMARY:
A plain 2-4 line summary of what the notice says: the notice type, the
issue raised, the amount/period involved if stated, and the deadline if
stated.

DRAFT_RESPONSE:
The formal response itself, structured as: (1) formal client header with Legal Name,
Trade Name, PAN, Address, and Signatory details provided, (2) reference line,
(3) brief acknowledgment, (4) numbered submissions addressing each point raised,
(5) closing paragraph, and (6) line noting enclosures.

Rules for the draft response:
- Write in the register used in real submissions to Indian tax authorities: formal, numbered paragraphs, precise.
- Incorporate all relevant Client details (Legal Name, Trade Name, PAN, Registered Address, Authorized Signatory) into the heading and text where appropriate.
- Do NOT invent figures, dates, or section numbers that were not provided. Mark missing info with "[CONFIRM: XYZ]".`;

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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

  if (!geminiApiKey) {
    return json({ error: "Server is missing GEMINI_API_KEY." }, 500);
  }

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
  if (!body || (!body.client_name && !body.client_details?.legal_name) || !body.notice_type) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (!body.notice_file_path && !body.original_notice_text) {
    return json({ error: "Attach the notice file, or paste the notice text." }, 400);
  }

  const clientName = body.client_details?.legal_name || body.client_name;

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

  // ── 2. Build Gemini request parts ──────────────────────────────────
  const parts: any[] = [];

  if (body.notice_file_path) {
    if (!String(body.notice_file_path).startsWith(`${user.id}/`)) {
      return json({ error: "Invalid file reference." }, 403);
    }

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("notice-uploads")
      .download(body.notice_file_path);

    if (downloadError || !fileBlob) {
      console.error("Storage download error:", downloadError);
      return json({ error: "Could not read the uploaded file." }, 500);
    }

    const extension = String(body.notice_file_path).split(".").pop()?.toLowerCase() ?? "";
    const mediaType = MIME_BY_EXTENSION[extension];
    if (!mediaType) {
      return json({ error: "Unsupported file type." }, 400);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    parts.push({
      inline_data: { mime_type: mediaType, data: base64Data },
    });
  }

  const c = body.client_details || {};
  const clientInfoText = `
CLIENT DETAILS / TAXPAYER KYC:
- Legal Name: ${c.legal_name || clientName}
- Trade Name: ${c.trade_name || "N/A"}
- PAN: ${c.pan || "N/A"}
- Entity Type: ${c.entity_type || "N/A"}
- Registered Address: ${c.registered_address || "N/A"}
- State & Pincode: ${c.state || "N/A"} ${c.pincode || ""}
- Authorized Signatory: ${c.signatory_name || "N/A"} (${c.signatory_designation || "N/A"})
- Contact: ${c.signatory_contact || "N/A"}
  `.trim();

  const textPrompt = `Notice type: ${body.notice_type}
Notice reference: ${body.notice_reference_no ?? "not provided"}

${clientInfoText}

${
  body.notice_file_path
    ? "The notice is attached above as a document. Read it directly."
    : `Full notice text:\n"""\n${body.original_notice_text}\n"""`
}

Respond now in the NOTICE_SUMMARY / DRAFT_RESPONSE format described in your instructions.`;

  parts.push({ text: textPrompt });

  // ── 3. Call Gemini ──────────────────────────────────────────────────
  const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingLevel: "low" },
      },
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("Gemini API error:", errText);
    return json({ error: "Draft generation failed." }, 502);
  }

  const geminiData = await geminiRes.json();
  const rawText = geminiData?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("\n")
    .trim();

  if (!rawText) {
    return json({ error: "Draft generation returned no content." }, 502);
  }

  const { summary, draft } = splitSummaryAndDraft(rawText);

  // ── 4. Save notice & update usage ──────────────────────────────────
  const { data: inserted, error: insertError } = await admin
    .from("notices")
    .insert({
      user_id: user.id,
      client_name: clientName,
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
    return json({ error: "Could not save draft." }, 500);
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}