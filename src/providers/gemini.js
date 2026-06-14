const { buildPrompt, parseResponse } = require('./common');

const DEFAULT_MODEL = 'gemini-2.0-flash';

async function analyze(apiKey, model, currentDoc, diff) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(currentDoc, diff) }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Gemini error ${res.status}: ${body.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return parseResponse(text);
}

module.exports = { analyze, DEFAULT_MODEL };
