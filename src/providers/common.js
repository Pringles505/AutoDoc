function buildPrompt(currentDoc, diff, { changelog = false } = {}) {
  const changelogField = changelog
    ? `,
  "changelogEntries": {
    "added": ["<new features or capabilities added>"],
    "changed": ["<existing behavior that changed>"],
    "fixed": ["<bugs or issues fixed>"],
    "removed": ["<features or behavior removed>"],
    "deprecated": ["<features marked for future removal>"],
    "security": ["<security-related fixes or improvements>"]
  }`
    : '';

  const changelogInstruction = changelog
    ? '\nAlso populate "changelogEntries" with human-readable bullet points describing the changes for each Keep-a-Changelog category. Only include categories that have actual entries — use empty arrays for the rest.'
    : '';

  return `Update the documentation to reflect the code changes in the diff.${changelogInstruction}

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
  "updatedDoc": "<full updated markdown doc>"${changelogField}
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
