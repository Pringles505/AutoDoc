const { buildPrompt, parseResponse } = require('./common');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

async function analyze(apiKey, model, currentDoc, diff) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: buildPrompt(currentDoc, diff) }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Anthropic error ${res.status}: ${body.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Anthropic');
  return parseResponse(text);
}

module.exports = { analyze, DEFAULT_MODEL };
