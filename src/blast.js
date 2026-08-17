require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { WhatsAppClient } = require('./client');

function parseArgs(argv) {
  const args = { file: 'data/contacts.example.csv', dryRun: false, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--text') args.text = argv[++i]; // sends free text instead of template (24h window only)
  }
  return args;
}

function loadContacts(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  return rows.filter((r) => r.phone);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const {
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_API_BASE = 'https://graph.facebook.com',
    WHATSAPP_API_VERSION = 'v21.0',
    WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANG = 'en_US',
    BLAST_RATE_PER_SECOND = '1',
  } = process.env;

  if (!args.dryRun && !WHATSAPP_ACCESS_TOKEN) {
    console.error('Missing WHATSAPP_ACCESS_TOKEN. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  if (!args.text && !WHATSAPP_TEMPLATE_NAME) {
    console.error('Set WHATSAPP_TEMPLATE_NAME in .env, or pass --text "message" for a free-text send.');
    process.exit(1);
  }

  const contacts = loadContacts(path.resolve(args.file)).slice(0, args.limit);
  const intervalMs = 1000 / Number(BLAST_RATE_PER_SECOND || 1);

  const client = args.dryRun
    ? null
    : new WhatsAppClient({
        accessToken: WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
        apiBase: WHATSAPP_API_BASE,
        apiVersion: WHATSAPP_API_VERSION,
      });

  const resultsPath = path.resolve('data', `blast-results-${Date.now()}.csv`);
  fs.writeFileSync(resultsPath, 'phone,status,detail\n');

  console.log(`Sending to ${contacts.length} contact(s), ${BLAST_RATE_PER_SECOND}/sec, dryRun=${args.dryRun}`);

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const { phone, name } = contact;

    if (args.dryRun) {
      console.log(`[dry-run] would send to ${phone}${name ? ` (${name})` : ''}`);
      sent++;
      await sleep(intervalMs);
      continue;
    }

    const result = args.text
      ? await client.sendTextMessage(phone, args.text)
      : await client.sendTemplateMessage(phone, WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANG, name ? [name] : []);

    if (result.ok) {
      sent++;
      fs.appendFileSync(resultsPath, `${phone},sent,\n`);
      console.log(`OK   ${phone}`);
    } else {
      failed++;
      const detail = JSON.stringify(result.error).replace(/,/g, ';').replace(/"/g, "'");
      fs.appendFileSync(resultsPath, `${phone},failed,"${detail}"\n`);
      console.log(`FAIL ${phone} -> ${result.error?.message || result.error?.code || 'unknown error'}`);
    }

    await sleep(intervalMs);
  }

  console.log(`\nDone. sent=${sent} failed=${failed}. Results: ${resultsPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
