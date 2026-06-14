const { buildPrompt, parseResponse } = require('./common');

const DEFAULT_MODEL = 'llama-3.1-8b-instant';

async function analyze(apiKey, model, currentDoc, diff, options = {}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(currentDoc, diff, options) }],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Groq error ${res.status}: ${body.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return parseResponse(text);
}

module.exports = { analyze, DEFAULT_MODEL };
