# wsapi — WhatsApp blast service (via Waboom / WhatsApp Cloud API)

Waboom doesn't run its own messaging endpoint — it's a no-code layer that
walks you through Meta's official WhatsApp Cloud API onboarding (Business
verification, WABA creation, phone number registration) and then hands you
the same credentials (access token + phone number ID) you'd get by doing it
directly with Meta. This service sends messages straight to Meta's Graph API
using those credentials.

## 1. Fix the `(#100) App_id in the input_token did not match the Viewing App` error (your current blocker)

Good news: your business/number is already verified — Quality Rating is
green and the phone number is active. This error is unrelated to
verification. It means the **Access Token** pasted into Waboom's
*WhatsApp Cloud API Setup* page was generated from a different Facebook
App than the one Waboom is configured to use for your WhatsApp Business
Account. Meta rejects any token whose owning App ID doesn't match the
App ID Waboom is "viewing" the WABA through.

**How to fix it:**

1. In [Meta for Developers](https://developers.facebook.com/apps), open
   **the exact App** that's linked to WhatsApp for this project (check
   under the app's **WhatsApp → API Setup** page — the WhatsApp Business
   Account ID shown there must match `1546762699711638`, the ID you
   entered in Waboom).
2. If you have multiple Facebook Apps (common if you clicked through
   setup more than once, or Waboom auto-created one for you), you likely
   generated the token from the wrong one. Use **Debug Token** (the grey
   button next to the Access Token field in your screenshot) — it will
   show you which App ID that token actually belongs to, so you can
   confirm the mismatch directly.
3. Generate a fresh token from the *correct* app: **WhatsApp → API
   Setup → Temporary access token** for a quick test, or **System Users
   → Generate New Token** (select that same app, scopes
   `whatsapp_business_management` + `whatsapp_business_messaging`) for a
   permanent one.
4. Paste that token and re-save. The "WhatsApp Business Account ID" field
   should then also flip from ❌ to ✅ once the token/App/WABA all agree.

If Waboom auto-provisioned the Facebook App for you (rather than you
connecting your own), it's often simpler to disconnect and let Waboom
recreate the whole App+WABA link from scratch than to hunt for the
right App ID by hand — worth trying if step 1–3 doesn't resolve it.

Once this is green, grab:
- `WHATSAPP_ACCESS_TOKEN` (use the permanent token, not the 24h temporary one)
- `WHATSAPP_PHONE_NUMBER_ID` — from your screenshot: `1266102803253222`

## 2. Fix the template (needed before any cold blast)

Meta requires a pre-approved template to message anyone who hasn't
messaged you in the last 24h — i.e. every recipient in a cold blast. Two
problems in the template you were building:

- **"The carousel templates must have at least 2 items"** — you picked
  **Carousel** as the template type but only added 1 card. Carousel
  templates need ≥2 cards, each with its own image and (if using a URL
  button) a filled-in **Example** value for the `{{1}}` placeholder — an
  empty Example is why submit was failing even before the card-count error.
- **Placeholder junk in Body Text** (`` {{1}} `````` fsdfsdf__sadasd** ``)
  — this looks like test scratch content, not real copy. Meta's review
  rejects templates with nonsense/test text, so this needs real message
  copy before submitting.

**For a first blast template, skip Carousel** — use a plain **Marketing**
category template with just a **Body** (optionally a text Header), no
buttons or cards. It reviews faster and is enough to unlock messaging.
Add the Carousel/button version later once you've confirmed sending works.

## 2. Configure this project

```bash
npm install
cp .env.example .env
# fill in WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME
```

## 3. Add your contact list

Edit `data/contacts.example.csv` (or create your own) with columns
`phone,name` — phone in international format, no `+` or spaces
(e.g. `15551234567`).

## 4. Test before blasting

```bash
# See what would be sent, no API calls, no credentials needed
node src/blast.js --file data/contacts.example.csv --dry-run

# Send to just the first contact for real, to confirm everything works
node src/blast.js --file data/contacts.example.csv --limit 1
```

## 5. Run the full blast

```bash
node src/blast.js --file data/contacts.csv
```

Results are written to `data/blast-results-<timestamp>.csv` with per-number
success/failure so you can see exactly what happened and retry failures.

## Notes / gotchas

- **Rate limit**: `BLAST_RATE_PER_SECOND` in `.env` defaults to `1`. New
  WhatsApp Business numbers start in a low messaging tier (often 250
  unique conversations/24h) that scales up automatically with good
  engagement — blasting too fast/too much on a new number is the #1 cause
  of numbers getting flagged or banned.
- **Templates only for cold outreach.** `sendTextMessage` (free text) only
  works if the recipient messaged you within the last 24 hours; otherwise
  use `sendTemplateMessage` (the default in `blast.js`).
- **Opt-in required.** Meta's policy requires recipients to have opted in
  to receive messages from your business; blasting purchased/scraped lists
  risks the number being banned regardless of technical setup.
