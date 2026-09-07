import express from "express";
import crypto from "crypto";
import { google } from "googleapis";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// ── Clients ────────────────────────────────────────────────────────────

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
    process.env.GOOGLE_REDIRECT_URI
  );
}

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
  if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
  return payload.userId;
}

function gmailClientForConnection(connection) {
  const oauth2Client = newOAuthClient();
  oauth2Client.setCredentials({ refresh_token: connection.refresh_token });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

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
// 1. START GMAIL CONNECTION
// ============================================================================
app.post("/api/gmail/connect-url", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const oauth2Client = newOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: signState(user.id),
  });

  return res.status(200).json({ url });
});

// ============================================================================
// 2. OAUTH CALLBACK
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
// 3. MANUAL RESYNC
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
// 4. RENEW ALL WATCHES
// ============================================================================
app.get("/api/gmail/renew-watches", async (req, res) => {
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
// 5. GMAIL PUB/SUB PUSH WEBHOOK
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

          // gemini-1.5-flash was retired and now returns a 404 on every
          // call — this line has been silently failing every extraction
          // attempt (caught below and falling back to a generic
          // "Unclassified" result with no PAN/GSTIN, which is why nothing
          // useful — sometimes nothing at all — has been showing up).
          // Note: gemini-2.5-flash itself is scheduled to retire no earlier
          // than Oct 16, 2026 — worth revisiting this line again before then.
          const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `You are an expert Indian Chartered Accountant assistant.
Analyze the following official tax notice text and extract details as strict JSON, no markdown wrapping:
{
  "firmName": "Firm or Business Name of taxpayer, if present, else null",
  "gstin": "The taxpayer's 15-character GSTIN printed on the notice, if present, else null",
  "pan": "The taxpayer's 10-character PAN printed on the notice, if present, else null",
  "signatoryName": "Name of Signing Authority, Assessing Officer, or Authorized Person, if present, else null",
  "noticeType": "Section 142(1) / ASMT-10 / DRC-01 / Section 148 / etc.",
  "taxAuthority": "Income Tax / GST / TRACES",
  "assessmentYear": "e.g., 2024-25",
  "dinNumber": "Document Identification Number if present, else null",
  "complianceDueDate": "YYYY-MM-DD or null",
  "summaryOfDemandOrMismatch": "Brief explanation of what the department is asking",
  "draftedReply": "Formal, professional, legally sound reply draft addressing the tax officer"
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
              firmName: null,
              gstin: null,
              pan: null,
              signatoryName: null,
              noticeType: "Unclassified",
              summaryOfDemandOrMismatch: "Automatic parsing failed — please review the attached PDF manually.",
              draftedReply: null,
            };
          }

          let matchedClientId = null;
          let matchedClientName = null;

          const extractedGstin = parsedJson.gstin ? String(parsedJson.gstin).trim().toUpperCase() : null;
          const extractedPan = parsedJson.pan ? String(parsedJson.pan).trim().toUpperCase() : null;

          if (extractedGstin) {
            const { data: gstinMatch } = await getSupabaseAdmin()
              .from("client_gstins")
              .select("client_id, clients!inner(id, legal_name, firm_id)")
              .eq("gstin", extractedGstin)
              .eq("clients.firm_id", connection.user_id)
              .maybeSingle();

            if (gstinMatch?.clients) {
              matchedClientId = gstinMatch.clients.id;
              matchedClientName = gstinMatch.clients.legal_name;
            }
          }

          if (!matchedClientId && extractedPan) {
            const { data: panMatch } = await getSupabaseAdmin()
              .from("clients")
              .select("id, legal_name")
              .eq("pan", extractedPan)
              .eq("firm_id", connection.user_id)
              .maybeSingle();

            if (panMatch) {
              matchedClientId = panMatch.id;
              matchedClientName = panMatch.legal_name;
            }
          }

          const storagePath = `${connection.user_id}/gmail-${msg.data.id}-${part.filename}`;
          const { error: uploadError } = await getSupabaseAdmin().storage
            .from("notice-uploads")
            .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

          if (uploadError) {
            console.error("[Storage Upload Error]:", uploadError.message);
          }

          const { error: dbError } = await getSupabaseAdmin().from("notices").upsert(
            {
              user_id: connection.user_id,
              client_id: matchedClientId,
              client_name: matchedClientId ? matchedClientName : (parsedJson.firmName || `Unassigned — ${fromHeader || "via Gmail"}`),
              firm_name: parsedJson.firmName || matchedClientName || null,
              gst_number: extractedGstin,
              pan_number: extractedPan,
              signatory_name: parsedJson.signatoryName || null,
              notice_type: parsedJson.noticeType || "Unclassified",
              original_notice_text: noticeText,
              drafted_reply: parsedJson.draftedReply || null,
              ai_draft_response: parsedJson.draftedReply || null,
              generated_response: parsedJson.draftedReply || null,
              email_address: emailAddress,
              message_id: msg.data.id,
              tax_authority: parsedJson.taxAuthority || null,
              assessment_year: parsedJson.assessmentYear || null,
              din_number: parsedJson.dinNumber || null,
              compliance_due_date: parsedJson.complianceDueDate || null,
              summary: parsedJson.summaryOfDemandOrMismatch || null,
              extracted_gstin: extractedGstin,
              extracted_pan: extractedPan,
              notice_file_path: uploadError ? null : storagePath,
              status: matchedClientId ? "drafted" : "pending_ca_review",
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

    await getSupabaseAdmin()
      .from("gmail_connections")
      .update({ last_history_id: pushedHistoryId, updated_at: new Date().toISOString() })
      .eq("user_id", connection.user_id);

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error("[Webhook Processing Error]:", err.message);
    return res.status(200).send("Error logged");
  }
});

// ============================================================================
// 6. FETCH NOTICES FOR DASHBOARD
// ============================================================================
app.get("/api/notices", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { status, source, limit = 20 } = req.query;

    let query = getSupabaseAdmin()
      .from("notices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq("status", status);
    // This was being silently ignored before — the frontend has been
    // asking for ?source=gmail all along, but every notice (manual and
    // Gmail-sourced alike) was returned regardless, which is why manual
    // drafts were showing up in the "Automated Email Extraction" table.
    if (source) query = query.eq("source", source);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Error fetching notices:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GLOBAL ERROR HANDLER
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