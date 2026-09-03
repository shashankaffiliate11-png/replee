// supabase/functions/draft-notice/index.ts
//
// NoticeDesk — draft-notice Edge Function (Gemini version)
//
// What this does:
// 1. Authenticates the calling CA via their Supabase session.
// 2. Checks their plan's draft limit for the current billing period.
// 3. Reads the tax notice (pasted text, or an uploaded file from Storage —
//    PDF/image, sent to Gemini natively).
// 4. Calls Google Gemini to generate a formal draft response.
// 5. Saves the draft to the database and returns it to the browser.
//
// NOTE: I don't have your exact table/column names (they were in the
// original Anthropic version of this file, which I haven't seen), so I've
// used sensible guesses based on what you described earlier:
//   - `profiles` table with `plan` and `drafts_used_this_period` columns
//   - `drafts` table with `user_id`, `notice_text`, `draft_text`, `created_at`
//   - `notices` bucket in Supabase Storage for uploaded files
// Search for "ADJUST ME" below and match these to your real schema before
// deploying — the drafting/Gemini logic itself doesn't need to change.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Plan limits — ADJUST ME to match your actual pricing tiers.
const PLAN_LIMITS: Record<string, number> = {
  free_trial: 3,
  starter: 15,
  professional: 50,
};

const GEMINI_MODEL = "gemini-2.5-flash"; // swap to gemini-2.5-pro for higher quality, higher cost
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // ADJUST ME: lock this down to your domain in production
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY secret is not set in Supabase.");
    }

    // ---- 1. Authenticate the caller ----------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing Authorization header.", 401);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Invalid or expired session.", 401);
    }

    // ---- 2. Check plan limit ------------------------------------------
    // ADJUST ME: match to your real `profiles` table columns.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan, drafts_used_this_period")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return jsonError("Could not load user plan.", 500);
    }

    const limit = PLAN_LIMITS[profile.plan] ?? 0;
    if (profile.drafts_used_this_period >= limit) {
      return jsonError(
        `You've used all ${limit} drafts on your current plan. Please upgrade to continue.`,
        403,
      );
    }

    // ---- 3. Read the notice (text and/or uploaded file) ----------------
    const body = await req.json();
    const noticeText: string | undefined = body.noticeText;
    const noticeFilePath: string | undefined = body.noticeFilePath; // path in Storage, if a file was uploaded

    if (!noticeText && !noticeFilePath) {
      return jsonError("No notice text or file provided.", 400);
    }

    // Gemini's "contents" array can mix text parts and inline file parts.
    // deno-lint-ignore no-explicit-any
    const parts: any[] = [];

    if (noticeFilePath) {
      // ADJUST ME: bucket name — this assumes a "notices" bucket.
      const { data: fileData, error: fileError } = await supabase.storage
        .from("notices")
        .download(noticeFilePath);

      if (fileError || !fileData) {
        return jsonError("Could not read the uploaded notice file.", 500);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = encodeBase64(arrayBuffer);
      const mimeType = guessMimeType(noticeFilePath);

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64,
        },
      });
    }

    parts.push({
      text: buildPrompt(noticeText),
    });

    // ---- 4. Call Gemini --------------------------------------------------
    const geminiResponse = await fetch(
      `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", errText);
      return jsonError("The AI drafting service failed. Please try again.", 502);
    }

    const geminiData = await geminiResponse.json();
    const draftText: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!draftText) {
      console.error("Unexpected Gemini response shape:", JSON.stringify(geminiData));
      return jsonError("The AI did not return a draft. Please try again.", 502);
    }

    // ---- 5. Save the draft and update usage count -------------------------
    // ADJUST ME: match to your real `drafts` table columns.
    const { data: savedDraft, error: saveError } = await supabase
      .from("drafts")
      .insert({
        user_id: user.id,
        notice_text: noticeText ?? null,
        notice_file_path: noticeFilePath ?? null,
        draft_text: draftText,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save draft:", saveError);
      return jsonError("Draft generated, but saving it failed.", 500);
    }

    await supabase
      .from("profiles")
      .update({ drafts_used_this_period: profile.drafts_used_this_period + 1 })
      .eq("id", user.id);

    // ---- 6. Return the draft to the browser -------------------------------
    return new Response(
      JSON.stringify({ draft: draftText, draftId: savedDraft.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unhandled error in draft-notice:", err);
    return jsonError("Something went wrong generating the draft.", 500);
  }
});

function buildPrompt(noticeText?: string): string {
  return `You are an expert Indian Chartered Accountant drafting a formal, ` +
    `precise response to a tax notice on behalf of a client. Read the notice ` +
    `provided (as text and/or an attached document) and produce a complete, ` +
    `professionally worded draft response addressing every point raised in ` +
    `the notice, in the correct formal register for correspondence with tax ` +
    `authorities. Do not invent facts not present in the notice or supplied ` +
    `context.` +
    (noticeText ? `\n\nNotice text:\n${noticeText}` : "");
}

function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
