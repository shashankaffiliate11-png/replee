const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const PUB_SUB_TOPIC = `projects/${GCP_PROJECT_ID}/topics/noticedesk-gmail-sub`;

/**
 * Helper to construct authenticated Gmail Client using client's stored OAuth tokens
 */
function getGmailClient(userOAuthTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(userOAuthTokens);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// =========================================================================
// 1. REGISTER CLIENT INBOX FOR REAL-TIME WATCHING
// Call this after a CA/Client onboard and authorizes NoticeDesk via Google OAuth
// =========================================================================
app.post('/api/clients/register-watch', async (req, res) => {
  try {
    const { clientId, userOAuthTokens } = req.body;
    const gmail = getGmailClient(userOAuthTokens);

    // Call Gmail watch() API
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: 'projects/noticedesk/topics/noticedesk-gmail-sub',
        labelIds: ['INBOX'],
        labelFilterBehavior: 'INCLUDE'
      }
    });

    // Save response.data.historyId and expiration in DB against this Client Profile
    // NOTE: Gmail watch expires every 7 days. Schedule a daily cron to renew this!
    console.log(`[Watch Registered] Client: ${clientId}`, {
      historyId: response.data.historyId,
      expirationEpoch: response.data.expiration
    });

    res.status(200).json({ success: true, watchData: response.data });
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    res.status(500).json({ error: error.message });
  }
});


// =========================================================================
// 2. REAL-TIME PUBSUB WEBHOOK LISTENER
// GCP Pub/Sub posts to this URL whenever a watched inbox receives a message
// =========================================================================
app.post('/webhooks/gmail', async (req, res) => {
  try {
    // 1. ACK the Pub/Sub request immediately to avoid retries
    res.status(200).send('OK');

    const pubsubMessage = req.body.message;
    if (!pubsubMessage || !pubsubMessage.data) return;

    // Decode the Base64 payload sent by Google Pub/Sub
    const decodedData = JSON.parse(
      Buffer.from(pubsubMessage.data, 'base64').toString('utf-8')
    );

    const clientEmail = decodedData.emailAddress; // e.g., accounts@abcpvtltd.com
    const newHistoryId = decodedData.historyId;

    console.log(`[Push Notification Received] Email: ${clientEmail}, HistoryId: ${newHistoryId}`);

    // 2. Fetch Stored Client Tokens & last historyId from your Database
    // const clientRecord = await DB.clients.findOne({ email: clientEmail });
    // const gmail = getGmailClient(clientRecord.oauthTokens);

    /* 
    3. Retrieve modified message IDs using users.history.list
       Compare historyId to get ONLY newly added emails.
    */
    /*
    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: clientRecord.lastHistoryId,
      historyTypes: ['messageAdded']
    });

    const history = historyRes.data.history || [];
    for (const record of history) {
      if (record.messagesAdded) {
        for (const msgObj of record.messagesAdded) {
          await processTaxEmail(gmail, msgObj.message.id, clientRecord);
        }
      }
    }

    // Update DB with the latest historyId
    // await DB.clients.update({ email: clientEmail }, { lastHistoryId: newHistoryId });
    */

  } catch (error) {
    console.error('Error processing Gmail webhook event:', error);
  }
});


/**
 * Helper to fetch full email and check if it's an official Tax Notice
 */
async function processTaxEmail(gmail, messageId, clientRecord) {
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId
  });

  const headers = msg.data.payload.headers;
  const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
  const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';

  // TAX DEPARTMENT SENDER FILTER
  const isTaxSender = /gst\.gov\.in|incometax\.gov\.in|tdscpc\.gov\.in/i.test(fromHeader);
  const isTaxSubject = /Notice|ASMT|DRC|142\(1\)|148|DIN|TRACES/i.test(subjectHeader);

  if (isTaxSender || isTaxSubject) {
    console.log(`[TAX NOTICE DETECTED] Subject: ${subjectHeader}`);

    // Parse attachments (PDFs) from msg.data.payload.parts
    // Pass extracted PDF Buffer to NoticeDesk AI Parser & Auto-Drafter
    // triggerNoticeDeskDraftPipeline(msg.data, clientRecord);
  }
}

app.listen(3000, () => console.log('NoticeDesk Gmail Webhook Engine listening on port 3000'));