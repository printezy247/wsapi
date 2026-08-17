# wsapi — WhatsApp blast service (via Waboom / WhatsApp Cloud API)

Waboom doesn't run its own messaging endpoint — it's a no-code layer that
walks you through Meta's official WhatsApp Cloud API onboarding (Business
verification, WABA creation, phone number registration) and then hands you
the same credentials (access token + phone number ID) you'd get by doing it
directly with Meta. This service sends messages straight to Meta's Graph API
using those credentials.

## Current status (updated 2026-08-18)

Setup is done: Business Portfolio "Jack PrintEzy" is verified, WABA `Jack`
(`2774576046261860`) is owned by it, a real phone number is connected
(`+60 11-7606 8370`, Quality Rating green, "Can Send Message: AVAILABLE"),
and Waboom has a permanent access token with the correct scopes
(`whatsapp_business_management`, `whatsapp_business_messaging`) — Access
Token and WABA ID both show green/configured in Waboom.

**Blocked on:** creating/approving a message template. Every attempt
(via Waboom, and via Meta's own native WhatsApp Manager directly) returns:

> This WABA is not allowed to create or update templates.

This has been isolated to a genuine **Meta-side account restriction** on
this specific WABA — it is not a Waboom bug and not a missing setting on
our end (see troubleshooting log below for everything already ruled out).
**Escalated to Meta support**; waiting on their response. Nothing else to
configure until they clear it.

## Step-by-step: get from where you are now to a working blast

Do these in order — later steps will keep failing until the earlier ones
are actually done.

1. ✅ **Verify your Business on Meta.** Done — Business Portfolio "Jack
   PrintEzy" is verified.
2. ✅ **Verify your email** on the Meta developer account, to allow
   generating a permanent access token. Done.
3. ⏳ **Create and get a template approved.** Currently blocked by the
   Meta-side "WABA not allowed to manage templates" restriction — see
   Current Status above. Once Meta clears it, use a body like:
   `Hello {{first_name}}, thanks for reaching out to us! We wanted to
   follow up on your inquiry.` (or `{{1}}` if using Number-type variables
   instead of Named) — variable in the middle, real surrounding text, and
   a filled sample value. Skip Carousel template type for the first
   template (needs ≥2 fully-filled cards); use a plain Marketing template
   with just a Body.
4. ✅ **Add a real phone number.** Done — `+60 11-7606 8370` is connected
   and active (no longer on Meta's capped Test Number).
5. **Send the blast** — two options, once step 3 clears:
   - **No-code**: Waboom's own **Campaigns** tab. Import your list under
     **Contacts**, pick the approved template, launch the campaign
     directly from the dashboard.
   - **Scripted / more control**: use `src/blast.js` in this repo (see
     below) — gives you per-number send logs and custom rate limiting
     against the same WhatsApp Cloud API credentials.

## Troubleshooting log

- **`(#100) The App_id in the input_token did not match the Viewing App`**
  — the Access Token pasted into Waboom's *WhatsApp Cloud API Setup* page
  was generated from a different Facebook App than the one Waboom links
  to your WhatsApp Business Account. Fixed by using **Debug Token** to
  confirm the mismatch, then regenerating the token from the correct App
  with `whatsapp_business_management` + `whatsapp_business_messaging`
  scopes. ✅ Resolved.
- **`Unsupported delete request... missing permissions`** on Save in
  Waboom — the System User generating the token had the **App** assigned
  as an asset but not the **WhatsApp account** itself (Business Settings
  → System Users → Assigned assets → Add assets → WhatsApp accounts).
  Regenerating the token after assigning the WABA asset fixed it. ✅
  Resolved.
- **`The carousel templates must have at least 2 items`** — picked
  Carousel template type with only 1 card filled in; Carousel needs ≥2
  cards each with a filled Example value. Avoided by using a plain
  Marketing/Body-only template instead.
- **`This template has too many variables for its length` / `Variables
  can't be at the start or end of template`** — body was just `Hello
  {{first_name}}`, a variable with almost no surrounding static text.
  Fixed by writing a full sentence around the variable.
- **`This template contains variable parameters with incorrect
  formatting`** — body used a named variable (`{{first_name}}`) while
  "Type of variable" was set to `Number`; Number-type templates require
  numbered placeholders (`{{1}}`, `{{2}}`, ...). Fix: either switch "Type
  of variable" to `Named`, or change the placeholder to `{{1}}`.
- **`Email verification is required before generating a permanent access
  token`** — verified the Meta developer account email; used the
  temporary token in the meantime. ✅ Resolved.
- **`WABA not allowed to manage templates` / `This WABA is not allowed to
  create or update templates`** — ⏳ **Not resolved.** Ruled out: Business
  Verification (done), WABA ownership by the verified business (confirmed
  in Business Settings → WhatsApp accounts), phone number status (green,
  AVAILABLE), and Waboom-specific bugs (same error reproduces in Meta's
  own native WhatsApp Manager, with no Waboom involved). No restriction
  banner appears anywhere in WhatsApp Manager's Overview/Alerts. This
  points to a backend-only account flag Meta needs to clear manually —
  escalated via Meta Business Help Center support with the WABA ID and
  full context. Nothing further to configure until they respond.

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
