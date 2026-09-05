import express from "express";
import crypto from "crypto";
import { google } from "googleapis";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// ── Clients ────────────────────────────────────────────────────────────
// Lazily created on first use, not at module load. createClient() throws
// immediately if its URL/key are missing or malformed — doing that at the
// top of the file meant one missing Vercel env var crashed the ENTIRE
// module, silently breaking every route in this file with an empty
// response (exactly the "Unexpected end of JSON input" symptom). Building
// each client inside a function means a misconfigured var now only fails
// the one request that actually needed it, with a real error message.

let _genAI = null;
function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.");
    }
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

let _supabaseAnon = null;
function getSupabaseAnon() {
  if (!_supabaseAnon) {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!process.env.SUPABASE_URL || !anonKey) {
      throw new Error("SUPABASE_URL or (VITE_)SUPABASE_ANON_KEY is not set.");
    }
    _supabaseAnon = createClient(process.env.SUPABASE_URL, anonKey);
  }
  return _supabaseAnon;
}

const APP_URL = process.env.APP_URL || "https://replee-three.vercel.app";
const STATE_SECRET = process.env.STATE_SECRET || "";

// ── Helpers ────────────────────────────────────────────────────────────

function newOAuthClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are not fully set (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI).");
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // must exactly match a redirect URI registered in Google Cloud Console
  );
}

// Verifies the caller's Supabase session from an Authorization: Bearer <jwt> header.
async function requireUser(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Missing authorization header." });
    return null;
  }
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await getSupabaseAnon().auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session." });
    return null;
  }
  return data.user;
}

// Signed state param so the OAuth callback (a plain browser redirect, no
// auth header available) can trust which user it belongs to.
function signState(userId) {
  const payload = JSON.stringify({ userId, ts: Date.now() });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", STATE_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

function verifyState(state) {
  const [payloadB64, sig] = String(state || "").split(".");
  if (!payloadB64 || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", STATE_SECRET).update(payloadB64).digest("hex");
  if (sig !== expectedSig) return null;
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  // 10-minute expiry on the OAuth round trip
  if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
  return payload.userId;
}

// Builds an authenticated Gmail client for a stored connection, using the
// refresh token — googleapis auto-refreshes the access token as needed.
function gmailClientForConnection(connection) {
  const oauth2Client = newOAuthClient();
  oauth2Client.setCredentials({ refresh_token: connection.refresh_token });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

// ── PAN / GSTIN auto-match ──────────────────────────────────────────────
// Indian tax notices print the taxpayer's PAN (Income Tax notices) and/or
// GSTIN (GST notices) directly in the document text. A GSTIN embeds the
// taxpayer's PAN at characters 3–12, e.g. GSTIN "27ABCDE1234F1Z5" contains
// PAN "ABCDE1234F" — so extracting both formats and matching either against
// a CA's own clients.pan lets a notice self-identify its client, with the
// existing manual "Assign to client" dropdown as the fallback when no PAN
// is found or no client matches.
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]Z[A-Z0-9]\b/g;

function extractCandidatePans(noticeText) {
  const text = (noticeText || "").toUpperCase();
  const candidates = new Set();

  for (const match of text.match(PAN_REGEX) || []) {
    candidates.add(match);
  }
  for (const match of text.match(GSTIN_REGEX) || []) {
    candidates.add(match.slice(2, 12)); // the PAN embedded inside the GSTIN
  }

  return Array.from(candidates);
}

// Fetches a CA's own client list and finds the first one whose PAN matches
// any PAN/GSTIN-derived candidate found in the notice text. Comparison is
// normalized (trimmed, uppercased) since manual entry via Onboard Client
// can't be relied on to be perfectly clean.
async function matchClientByPan(firmId, noticeText) {
  const candidates = extractCandidatePans(noticeText);
  if (candidates.length === 0) return null;

  const { data: clients, error } = await getSupabaseAdmin()
    .from("clients")
    .select("id, legal_name, pan")
    .eq("firm_id", firmId);

  if (error || !clients) return null;

  for (const client of clients) {
    if (!client.pan) continue;
    const normalizedClientPan = client.pan.trim().toUpperCase();
    if (candidates.includes(normalizedClientPan)) {
      return { id: client.id, legal_name: client.legal_name };
    }
  }

  return null;
}

// Starts (or renews) a Gmail watch for one connected mailbox, and resets
// last_history_id to the mailbox's current point — so we only ever process
// mail that arrives after this call, never the entire mailbox history.
async function registerWatchForConnection(connection) {
  const gmail = gmailClientForConnection(connection);

  const projectId = process.env.GCP_PROJECT_ID;
  const topicName = process.env.GCP_PUBSUB_TOPIC_NAME;

  const watchRes = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: `projects/${projectId}/topics/${topicName}`,
      labelIds: ["INBOX"],
    },
  });

  await getSupabaseAdmin()
    .from("gmail_connections")
    .update({
      last_history_id: watchRes.data.historyId,
      watch_expiration: new Date(Number(watchRes.data.expiration)).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id);

  return watchRes.data;
}

// ============================================================================
// 1. START GMAIL CONNECTION — returns the Google consent URL for the caller
// ============================================================================
app.post("/api/gmail/connect-url", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const oauth2Client = newOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // required to receive a refresh_token
    prompt: "consent", // forces refresh_token on repeat connections too
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: signState(user.id),
  });

  return res.status(200).json({ url });
});

// ============================================================================
// 2. OAUTH CALLBACK — Google redirects the browser here after consent
// ============================================================================
app.get("/api/gmail/oauth-callback", async (req, res) => {
  try {
    const { code, state, error: googleError } = req.query;

    if (googleError) {
      return res.redirect(`${APP_URL}/app/settings?gmail=error&reason=${encodeURIComponent(googleError)}`);
    }

    const userId = verifyState(state);
    if (!userId) {
      return res.redirect(`${APP_URL}/app/settings?gmail=error&reason=invalid_state`);
    }

    const oauth2Client = newOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      // Happens if the user previously connected and Google didn't re-issue
      // a refresh_token. Since we pass prompt=consent this should be rare,
      // but if it happens we can't proceed without one.
      return res.redirect(`${APP_URL}/app/settings?gmail=error&reason=no_refresh_token`);
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });

    const { error: upsertError } = await getSupabaseAdmin().from("gmail_connections").upsert(
      {
        user_id: userId,
        connected_email: profile.data.emailAddress,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("[Gmail Connect] Failed to save connection:", upsertError.message);
      return res.redirect(`${APP_URL}/app/settings?gmail=error&reason=save_failed`);
    }

    const { data: connection } = await getSupabaseAdmin()
      .from("gmail_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    await registerWatchForConnection(connection);

    return res.redirect(`${APP_URL}/app/settings?gmail=connected`);
  } catch (err) {
    console.error("[Gmail OAuth Callback Error]:", err.message);
    return res.redirect(`${APP_URL}/app/settings?gmail=error&reason=${encodeURIComponent(err.message)}`);
  }
});

// ============================================================================
// 3. MANUAL RESYNC — lets a signed-in user re-trigger their own watch
// ============================================================================
app.post("/api/gmail/resync", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data: connection, error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !connection) {
    return res.status(400).json({ error: "Gmail is not connected yet." });
  }

  try {
    const watchData = await registerWatchForConnection(connection);
    return res.status(200).json({ success: true, data: watchData });
  } catch (err) {
    console.error("[Gmail Resync Error]:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. RENEW ALL WATCHES — called daily by Vercel Cron (watches expire in 7 days)
// ============================================================================
app.get("/api/gmail/renew-watches", async (req, res) => {
  // Vercel Cron automatically sends this header when CRON_SECRET is set as
  // a project environment variable — see Vercel's Cron Jobs documentation.
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { data: connections, error } = await getSupabaseAdmin().from("gmail_connections").select("*");
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const results = [];
  for (const connection of connections || []) {
    try {
      await registerWatchForConnection(connection);
      results.push({ user_id: connection.user_id, status: "renewed" });
    } catch (err) {
      console.error(`[Renew Failed] user_id ${connection.user_id}:`, err.message);
      results.push({ user_id: connection.user_id, status: "failed", error: err.message });
    }
  }

  return res.status(200).json({ success: true, results });
});

// ============================================================================
// 5. GMAIL PUB/SUB PUSH WEBHOOK — Google calls this on every new message
// ============================================================================
app.post("/webhooks/gmail", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(200).send("No message payload");
    }

    const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
    const { emailAddress, historyId: pushedHistoryId } = JSON.parse(decodedData);

    console.log(`[Push Notification] ${emailAddress} — historyId ${pushedHistoryId}`);

    const { data: connection, error: connError } = await getSupabaseAdmin()
      .from("gmail_connections")
      .select("*")
      .eq("connected_email", emailAddress)
      .maybeSingle();

    if (connError || !connection) {
      console.warn(`[Push Ignored] No connection on file for ${emailAddress}`);
      return res.status(200).send("No matching connection");
    }

    const gmail = gmailClientForConnection(connection);

    // Always resume from our own last-processed point, never trust the
    // pushed historyId alone — Pub/Sub can coalesce or reorder notifications.
    const startHistoryId = connection.last_history_id || pushedHistoryId;

    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
    });

    const histories = historyRes.data.history || [];

    for (const item of histories) {
      for (const msgAdded of item.messagesAdded || []) {
        const msg = await gmail.users.messages.get({ userId: "me", id: msgAdded.message.id });

        const headers = msg.data.payload.headers || [];
        const fromHeader = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
        const subjectHeader = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";

        const isTaxSender = /gst\.gov\.in|incometax\.gov\.in|tdscpc\.gov\.in/i.test(fromHeader);
        const isTaxSubject = /Notice|ASMT|DRC|142\(1\)|148|DIN|TRACES/i.test(subjectHeader);

        if (!isTaxSender && !isTaxSubject) continue;

        console.log(`[Tax Notice Detected] ${subjectHeader}`);

        const parts = msg.data.payload.parts || [];
        for (const part of parts) {
          if (!part.filename || !part.filename.toLowerCase().endsWith(".pdf")) continue;

          const attachment = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: msg.data.id,
            id: part.body.attachmentId,
          });

          const pdfBuffer = Buffer.from(attachment.data.data, "base64url");
          const parsedPdf = await pdfParse(pdfBuffer);
          const noticeText = parsedPdf.text?.trim() || "(No extractable text in attached PDF)";

          const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `You are an expert Indian Chartered Accountant assistant.
Analyze the following official tax notice text and extract details as strict JSON, no markdown wrapping:
{
  "noticeType": "Section 142(1) / ASMT-10 / DRC-01 / etc.",
  "taxAuthority": "Income Tax / GST / TRACES",
  "assessmentYear": "e.g., 2024-25",
  "dinNumber": "Document Identification Number if present, else null",
  "complianceDueDate": "YYYY-MM-DD or null",
  "summaryOfDemandOrMismatch": "Brief explanation of what the department is asking",
  "draftedReply": "Formal, professional reply draft addressing the tax officer"
}

Notice Text:
"${noticeText}"`;

          let parsedJson;
          try {
            const result = await model.generateContent(prompt);
            const raw = result.response.text().replace(/```json|```/g, "").trim();
            parsedJson = JSON.parse(raw);
          } catch (aiErr) {
            console.error("[Gemini parse error]:", aiErr.message);
            parsedJson = {
              noticeType: "Unclassified",
              summaryOfDemandOrMismatch: "Automatic parsing failed — please review the attached PDF manually.",
              draftedReply: null,
            };
          }

          // Upload the original PDF to the same private bucket manual
          // uploads use, under this user's own folder.
          const storagePath = `${connection.user_id}/gmail-${msg.data.id}-${part.filename}`;
          const { error: uploadError } = await getSupabaseAdmin().storage
            .from("notice-uploads")
            .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

          if (uploadError) {
            console.error("[Storage Upload Error]:", uploadError.message);
          }

          // Try to auto-identify the client from a PAN/GSTIN printed in the
          // notice itself before falling back to "Unassigned" — see
          // matchClientByPan above.
          const matchedClient = await matchClientByPan(connection.user_id, noticeText);

          const { error: dbError } = await getSupabaseAdmin().from("notices").upsert(
            {
              user_id: connection.user_id,
              client_id: matchedClient?.id ?? null,
              client_name: matchedClient?.legal_name ?? `Unassigned — ${fromHeader || "via Gmail"}`,
              notice_type: parsedJson.noticeType || "Unclassified",
              original_notice_text: noticeText,
              // Auto-matched notices go straight into the same reviewable
              // state a manually-assigned one ends up in — ai_draft_response
              // and final_response are what NoticeDetail.tsx actually reads,
              // so the draft must land there now, not just in drafted_reply,
              // or the CA opens the notice to an empty editor.
              drafted_reply: parsedJson.draftedReply || null,
              ai_draft_response: matchedClient ? parsedJson.draftedReply || null : null,
              final_response: matchedClient ? parsedJson.draftedReply || null : null,
              email_address: emailAddress,
              message_id: msg.data.id,
              tax_authority: parsedJson.taxAuthority || null,
              assessment_year: parsedJson.assessmentYear || null,
              din_number: parsedJson.dinNumber || null,
              compliance_due_date: parsedJson.complianceDueDate || null,
              summary: parsedJson.summaryOfDemandOrMismatch || null,
              notice_file_path: uploadError ? null : storagePath,
              status: matchedClient ? "drafted" : "pending_ca_review",
              source: "gmail",
            },
            { onConflict: "message_id" }
          );

          if (dbError) {
            console.error("[Supabase Save Error]:", dbError.message);
          } else {
            console.log("[Notice Saved]", msg.data.id);
          }
        }
      }
    }

    // Advance our checkpoint so the next push only looks at what's new.
    await getSupabaseAdmin()
      .from("gmail_connections")
      .update({ last_history_id: pushedHistoryId, updated_at: new Date().toISOString() })
      .eq("user_id", connection.user_id);

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error("[Webhook Processing Error]:", err.message);
    // Always 200 back to Pub/Sub for errors we can't recover from by
    // retrying — otherwise Pub/Sub will redeliver the same push forever.
    return res.status(200).send("Error logged");
  }
});

// ============================================================================
// 6. FETCH NOTICES FOR DASHBOARD (used by both manual and Gmail-sourced rows)
// ============================================================================
// SECURITY FIX: this previously had no auth check and returned every user's
// notices to any caller. Now requires a valid session and always scopes to
// that user's own rows — the same guarantee Supabase RLS gives direct
// table access, since this endpoint uses the service-role key and must
// enforce that scoping itself.
app.get("/api/notices", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { status, limit = 20 } = req.query;

    let query = getSupabaseAdmin()
      .from("notices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Error fetching notices:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GLOBAL ERROR HANDLER — must be the last app.use(). Catches anything that
// slips past a route's own try/catch (including the lazy client getters
// above throwing when an env var is missing) and guarantees the browser
// always receives real JSON, never an empty/crashed response.
// ============================================================================
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || "Internal server error." });
});

export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`NoticeDesk Gmail ingestion engine listening on port ${PORT}`));
}
