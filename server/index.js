const express = require('express');
const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// OAuth2 Client helper function
function getGmailClient(userOAuthTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(userOAuthTokens);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// ============================================================================
// 1. REGISTER CLIENT INBOX FOR REAL-TIME WATCHING
// ============================================================================
app.post('/api/clients/register-watch', async (req, res) => {
  try {
    const { clientId, userOAuthTokens } = req.body;
    const gmail = getGmailClient(userOAuthTokens);

    const projectId = process.env.GCP_PROJECT_ID || 'noticedesk';
    const topicName = process.env.GCP_PUBSUB_TOPIC_NAME || 'noticedesk-gmail-sub';

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${projectId}/topics/${topicName}`,
        labelIds: ['INBOX'],
      },
    });

    console.log(`[Watch Registered] Client: ${clientId}`, response.data);
    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error registering Gmail watch:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2. GMAIL PUB/SUB PUSH WEBHOOK ENDPOINT
// ============================================================================
app.post('/webhooks/gmail', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(200).send('No message payload');
    }

    // Decode Pub/Sub notification data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const pubSubPayload = JSON.parse(decodedData);
    const { emailAddress, historyId } = pubSubPayload;

    console.log(`[Push Notification Received] Email: ${emailAddress}, History ID: ${historyId}`);

    // Retrieve active OAuth tokens for this client (Inject/replace with DB lookup in production)
    const userOAuthTokens = req.body.userOAuthTokens || {
      access_token: process.env.TEMP_USER_ACCESS_TOKEN,
    };

    if (!userOAuthTokens.access_token) {
      console.warn('Missing OAuth tokens for webhook processing');
      return res.status(200).send('Webhook received but lacking access tokens');
    }

    const gmail = getGmailClient(userOAuthTokens);

    // Fetch message list updated since this historyId
    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded'],
    });

    const histories = historyRes.data.history || [];
    for (const item of histories) {
      const messagesAdded = item.messagesAdded || [];
      for (const msgAdded of messagesAdded) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: msgAdded.message.id,
        });

        const headers = msg.data.payload.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';

        // TAX DEPARTMENT SENDER & SUBJECT FILTER
        const isTaxSender = /gst\.gov\.in|incometax\.gov\.in|tdscpc\.gov\.in/i.test(fromHeader);
        const isTaxSubject = /Notice|ASMT|DRC|142\(1\)|148|DIN|TRACES/i.test(subjectHeader);

        if (isTaxSender || isTaxSubject) {
          console.log(`[TAX NOTICE DETECTED] Subject: ${subjectHeader}`);

          const parts = msg.data.payload.parts || [];
          for (const part of parts) {
            if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
              console.log(`[Processing PDF Attachment]: ${part.filename}`);

              // Download raw PDF attachment bytes from Gmail API
              const attachment = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msg.data.id,
                id: part.body.attachmentId,
              });

              // Convert base64url string to Buffer and parse text
              const pdfBuffer = Buffer.from(attachment.data.data, 'base64url');
              const parsedPdf = await pdfParse(pdfBuffer);

              // Analyze PDF text with Gemini AI
              const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
              const prompt = `
                You are an expert Indian Chartered Accountant assistant.
                Analyze the following official tax notice text and extract details as JSON:
                
                Notice Text:
                "${parsedPdf.text}"
                
                JSON Output Format:
                {
                  "noticeType": "Section 142(1) / ASMT-10 / DRC-01 / etc.",
                  "taxAuthority": "Income Tax / GST / TRACES",
                  "assessmentYear": "e.g., 2024-25",
                  "dinNumber": "Document Identification Number if present",
                  "complianceDueDate": "YYYY-MM-DD",
                  "summaryOfDemandOrMismatch": "Brief explanation of what the department is asking",
                  "draftedReply": "Formal, professional reply draft addressing the tax officer"
                }
              `;

              const result = await model.generateContent(prompt);
              console.log('[AI DRAFT & ANALYSIS GENERATED]:');
              console.log(result.response.text());

              // TODO: Save noticeData & result to Database (e.g. MongoDB/PostgreSQL)
            }
          }
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Export Express app for Vercel Serverless environment
module.exports = app;

// Start local listener only when executing outside production
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`NoticeDesk Gmail Webhook Engine listening on port ${PORT}`));
}