// Auto-reply rules, checked top to bottom — first match wins.
// `match` can be a string (case-insensitive substring) or a RegExp.
// `reply` is the text sent back. `trigger` (optional) is an async function
// run alongside the reply — put custom logic there (tagging, webhooks, etc).

module.exports = [
  {
    name: 'stop-unsubscribe',
    match: /^(stop|unsubscribe|berhenti)$/i,
    reply: "You've been unsubscribed and won't receive further messages from us. Reply START to opt back in.",
    trigger: async ({ from, message }) => {
      console.log(`[trigger] unsubscribe requested by ${from}`);
      // e.g. mark this contact as opted-out in your own contact list/CRM
    },
  },
  {
    name: 'greeting',
    match: /\b(hi|hello|hey)\b/i,
    reply: 'Hi! Thanks for messaging us. How can we help you today?',
  },
  {
    name: 'pricing',
    match: 'price',
    reply: "Here's our pricing info: https://example.com/pricing",
    trigger: async ({ from }) => {
      console.log(`[trigger] pricing inquiry from ${from}`);
      // e.g. notify sales, log a lead
    },
  },
];

// Sent when no rule matches. Set to null to send nothing.
module.exports.fallback = "Thanks for your message! A team member will get back to you shortly.";
