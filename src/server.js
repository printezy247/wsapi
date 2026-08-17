require('dotenv').config();
const express = require('express');
const { WhatsAppClient } = require('./client');
const { handleMessage } = require('./autoReplyEngine');

const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_API_BASE = 'https://graph.facebook.com',
  WHATSAPP_API_VERSION = 'v21.0',
  WEBHOOK_VERIFY_TOKEN,
  PORT = 3000,
} = process.env;

if (!WEBHOOK_VERIFY_TOKEN) {
  console.error('Missing WEBHOOK_VERIFY_TOKEN in .env — required to register the webhook with Meta.');
  process.exit(1);
}

const client = new WhatsAppClient({
  accessToken: WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
  apiBase: WHATSAPP_API_BASE,
  apiVersion: WHATSAPP_API_VERSION,
});

const app = express();
app.use(express.json());

// Meta calls this once, when you register the webhook URL in the app dashboard.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Meta calls this for every inbound message/status update.
app.post('/webhook', async (req, res) => {
  // Always 200 quickly — Meta retries on non-2xx and will disable the
  // webhook after repeated failures.
  res.sendStatus(200);

  const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages) return; // status updates (delivered/read) land here too — ignore

  for (const msg of messages) {
    if (msg.type !== 'text') continue; // extend here for buttons/interactive replies

    const from = msg.from;
    const text = msg.text.body;
    console.log(`[in] ${from}: ${text}`);

    try {
      const reply = await handleMessage({ from, text });
      if (reply) {
        const result = await client.sendTextMessage(from, reply);
        if (!result.ok) console.error('[out] send failed:', result.error);
        else console.log(`[out] ${from}: ${reply}`);
      }
    } catch (err) {
      console.error('Error handling inbound message:', err);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
