function buildPrompt(currentDoc, diff) {
  return `Update the documentation to reflect the code changes in the diff.

Current documentation:
===
${currentDoc}
===

Git diff:
===
${diff}
===

Return JSON only, no extra text:
{
  "hasChanges": <true if anything needs updating, false otherwise>,
  "summary": "<what specifically changed, e.g. 'renamed login() to authenticate(), added optional timeout param'>",
  "sections": [
    {
      "type": "<update | add | remove>",
      "section": "<section heading>",
      "reason": "<what changed and why the docs need to reflect it, e.g. 'config.port was renamed to config.serverPort'>"
    }
  ],
  "updatedDoc": "<full updated markdown doc>"
}`;
}

function parseResponse(raw) {
  // Strip accidental code block wrapping from models that ignore instructions
  const text = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`AI returned non-JSON response:\n${raw.slice(0, 300)}`);
  }
}

module.exports = { buildPrompt, parseResponse };
