# wsapi — WhatsApp blast service (via Waboom / WhatsApp Cloud API)

Waboom doesn't run its own messaging endpoint — it's a no-code layer that
walks you through Meta's official WhatsApp Cloud API onboarding (Business
verification, WABA creation, phone number registration) and then hands you
the same credentials (access token + phone number ID) you'd get by doing it
directly with Meta. This service sends messages straight to Meta's Graph API
using those credentials.

## Step-by-step: get from where you are now to a working blast

Do these in order — later steps will keep failing until the earlier ones
are actually done.

1. **Verify your Business on Meta.** Go to `business.facebook.com` →
   **Business Settings → Security Center** (or "Business Info") and check
   **Business Verification** status. This is almost certainly the reason
   you're seeing "WABA not allowed to manage templates" — it's separate
   from phone number verification (which is already green/done for you).
   Submit your legal business name, address, and a matching document
   (business registration, utility bill) or website. Usually clears in
   1–2 business days.
2. **Verify your email** on the Meta developer account (Meta for
   Developers → your app → **Settings → Basic**, check/verify the contact
   email) so you can generate a **permanent** access token later. Until
   it's verified, use the **Temporary access token** (24h) so you're not
   blocked from testing in the meantime.
3. **Fix your template body.** A variable at the very start/end, or too
   short a body, gets auto-rejected. Use something like:
   `Hello {{first_name}}, thanks for reaching out to us! We wanted to
   follow up on your inquiry.` — variable in the middle, real surrounding
   text. Also skip **Carousel** template type for your first template
   (needs ≥2 fully-filled cards); use a plain **Marketing** template with
   just a Body (and optional Header) — it reviews faster.
4. **Resubmit the template** (Waboom sidebar → **Templates**) only after
   step 1 clears — resubmitting while the business is unverified will
   likely fail again regardless of the content fix. Approval after that is
   usually minutes to a few hours.
5. **Add a real phone number.** Your current number is Meta's **Test
   Number** (`+1 555-663-0104`), capped at 5 recipients total, ever. For
   an actual blast, go to **WhatsApp Business Info → Manage Phone
   Numbers** and register your own business number instead.
6. **Send the blast** — two options:
   - **No-code**: Waboom's own **Campaigns** tab. Import your list under
     **Contacts**, pick the approved template, launch the campaign
     directly from the dashboard.
   - **Scripted / more control**: use `src/blast.js` in this repo (see
     below) — gives you per-number send logs and custom rate limiting
     against the same WhatsApp Cloud API credentials.

## Troubleshooting log (issues already hit and fixed)

- **`(#100) The App_id in the input_token did not match the Viewing App`**
  — the Access Token pasted into Waboom's *WhatsApp Cloud API Setup* page
  was generated from a different Facebook App than the one Waboom links
  to your WhatsApp Business Account. Fixed by using **Debug Token** to
  confirm the mismatch, then regenerating the token from the correct App
  (WhatsApp → API Setup, or System Users, with
  `whatsapp_business_management` + `whatsapp_business_messaging` scopes).
  ✅ Resolved — Access Token and WABA ID both show green now.
- **`WABA not allowed to manage templates`** — caused by Business
  Verification not being complete (see step 1 above). Not yet resolved.
- **`The carousel templates must have at least 2 items`** — picked
  Carousel template type with only 1 card filled in; Carousel needs ≥2
  cards each with a filled Example value. Recommendation: don't use
  Carousel for the first template.
- **`This template has too many variables for its length` / `Variables
  can't be at the start or end of template`** — body was just `Hello
  {{first_name}}`, a variable with almost no surrounding static text.
  Fix: write a full sentence around the variable (see step 3 above).
- **`Email verification is required before generating a permanent access
  token`** — verify the Meta developer account email (see step 2 above);
  use the temporary token in the meantime.

## Using the blast script in this repo

### Configure

```bash
npm install
cp .env.example .env
# fill in WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME
```

### Add your contact list

Edit `data/contacts.example.csv` (or create your own) with columns
`phone,name` — phone in international format, no `+` or spaces
(e.g. `15551234567`).

### Test before blasting

```bash
# See what would be sent, no API calls, no credentials needed
node src/blast.js --file data/contacts.example.csv --dry-run

# Send to just the first contact for real, to confirm everything works
node src/blast.js --file data/contacts.example.csv --limit 1
```

### Run the full blast

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
