const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHANGELOG_HEADER = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

`;

const CATEGORIES = [
  ['added', 'Added'],
  ['changed', 'Changed'],
  ['fixed', 'Fixed'],
  ['removed', 'Removed'],
  ['deprecated', 'Deprecated'],
  ['security', 'Security'],
];

function detectVersionBump(diff) {
  let oldVersion = null;
  let newVersion = null;
  let inPackageJson = false;

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git')) {
      inPackageJson = line.includes('package.json');
      continue;
    }
    if (!inPackageJson) continue;

    const removed = line.match(/^-\s*"version":\s*"([^"]+)"/);
    const added = line.match(/^\+\s*"version":\s*"([^"]+)"/);
    if (removed) oldVersion = removed[1];
    if (added) newVersion = added[1];
  }

  if (oldVersion && newVersion && oldVersion !== newVersion) {
    return { oldVersion, newVersion };
  }
  return null;
}

function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0 2>nul', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  try {
    const cmd = tag ? `git log ${tag}..HEAD --oneline` : 'git log --oneline -30';
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function readOrCreateChangelog(changelogPath) {
  if (fs.existsSync(changelogPath)) {
    return fs.readFileSync(changelogPath, 'utf8');
  }
  return CHANGELOG_HEADER;
}

// Merge new entries into the [Unreleased] section of the changelog content.
// Creates the section if it doesn't exist.
function mergeIntoUnreleased(content, entries) {
  const hasEntries = CATEGORIES.some(([key]) => entries[key]?.length > 0);
  if (!hasEntries) return content;

  // Find [Unreleased] section
  const unreleasedMatch = content.match(/^## \[Unreleased\][^\n]*/im);

  if (!unreleasedMatch) {
    // Insert [Unreleased] before the first versioned section or at the end
    const firstVersionIdx = content.search(/^## \[\d/m);
    const insertIdx = firstVersionIdx !== -1 ? firstVersionIdx : content.length;
    const newSection = buildNewSection(entries) + '\n';
    return content.slice(0, insertIdx) + `## [Unreleased]\n\n${newSection}\n` + content.slice(insertIdx);
  }

  const headerStart = content.indexOf(unreleasedMatch[0]);
  const afterHeader = headerStart + unreleasedMatch[0].length + 1; // +1 for newline

  // Find end of [Unreleased] section (next ## heading or EOF)
  const rest = content.slice(afterHeader);
  const nextSectionIdx = rest.search(/^## /m);
  const sectionEnd = nextSectionIdx !== -1 ? afterHeader + nextSectionIdx : content.length;

  let sectionBody = content.slice(afterHeader, sectionEnd);

  // Merge each category into existing subsections or append new ones
  for (const [key, label] of CATEGORIES) {
    const items = entries[key];
    if (!items || items.length === 0) continue;

    const newLines = items.map((i) => `- ${i}`).join('\n');
    const headingLine = `### ${label}`;
    const headingIdx = sectionBody.indexOf(`\n${headingLine}\n`);

    if (headingIdx !== -1) {
      // Insert items right after the heading line
      const insertAt = headingIdx + headingLine.length + 2; // after \n### Label\n
      sectionBody = sectionBody.slice(0, insertAt) + newLines + '\n' + sectionBody.slice(insertAt);
    } else {
      // Append new subsection
      if (!sectionBody.endsWith('\n')) sectionBody += '\n';
      sectionBody += `\n${headingLine}\n\n${newLines}\n`;
    }
  }

  return content.slice(0, afterHeader) + sectionBody + content.slice(sectionEnd);
}

// Rename [Unreleased] to [version] - date and prepend a fresh [Unreleased] above it.
function promoteToVersion(content, version, date) {
  return content.replace(
    /^## \[Unreleased\][^\n]*/im,
    `## [Unreleased]\n\n## [${version}] - ${date}`
  );
}

function buildNewSection(entries) {
  const lines = [];
  for (const [key, label] of CATEGORIES) {
    const items = entries[key];
    if (!items || items.length === 0) continue;
    lines.push(`### ${label}`, '');
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }
  return lines.join('\n');
}

function updateChangelog(changelogPath, entries, versionBump) {
  const dir = path.dirname(changelogPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let content = readOrCreateChangelog(changelogPath);

  // First add entries to [Unreleased]
  content = mergeIntoUnreleased(content, entries);

  // Then promote [Unreleased] to a versioned section if version bumped
  if (versionBump) {
    const date = new Date().toISOString().split('T')[0];
    content = promoteToVersion(content, versionBump.newVersion, date);
  }

  fs.writeFileSync(changelogPath, content);
}

module.exports = {
  detectVersionBump,
  getLastTag,
  getCommitsSinceTag,
  updateChangelog,
};
