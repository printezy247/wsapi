const rules = require('./rules');

function matches(rule, text) {
  if (rule.match instanceof RegExp) return rule.match.test(text);
  return text.toLowerCase().includes(String(rule.match).toLowerCase());
}

function findRule(text) {
  return rules.find((rule) => matches(rule, text));
}

// Runs the matching rule's trigger (if any) and returns the reply text to
// send, or null if nothing should be sent.
async function handleMessage({ from, text }) {
  const rule = findRule(text);

  if (!rule) {
    return rules.fallback ?? null;
  }

  if (rule.trigger) {
    try {
      await rule.trigger({ from, message: text });
    } catch (err) {
      console.error(`[trigger] rule "${rule.name}" threw:`, err);
    }
  }

  return rule.reply ?? null;
}

module.exports = { handleMessage };
