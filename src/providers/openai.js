const { buildPrompt, parseResponse } = require('./common');

const DEFAULT_MODEL = 'gpt-4o-mini';

async function analyze(apiKey, model, currentDoc, diff) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(currentDoc, diff) }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error ${res.status}: ${body.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return parseResponse(text);
}

module.exports = { analyze, DEFAULT_MODEL };
