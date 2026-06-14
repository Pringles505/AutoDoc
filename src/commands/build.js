const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { getConfig } = require('../config');
const { getDiff, getStagedFiles, isGitRepo } = require('../git');
const { getProvider } = require('../providers');
const { log } = require('../ui');
const { detectVersionBump, updateChangelog } = require('../changelog');

async function runBuild(options = {}) {
  if (!isGitRepo()) {
    log.error('Not a git repository. AutoDoc requires git.');
    process.exit(1);
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  // Doc file: CLI flag overrides config
  const docFilePath = options.doc
    ? path.resolve(process.cwd(), options.doc)
    : path.resolve(process.cwd(), config.docFile);

  if (!fs.existsSync(docFilePath)) {
    log.error(`Doc file not found: ${options.doc || config.docFile}`);
    log.info('Run `autodoc init` to create it, or pass --doc <path>.');
    process.exit(1);
  }

  if (!config.apiKey) {
    log.error('No API key found.');
    log.info(
      `Set it in .autodocrc (apiKey), a .env file (AUTODOC_API_KEY or provider-specific), or export it in your shell.`
    );
    process.exit(1);
  }

  // Get diff
  const diffType = options.diff || 'staged';
  log.info(`Checking ${diffType} changes...`);

  let diff;
  try {
    diff = getDiff(diffType);
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  if (!diff.trim()) {
    if (diffType === 'staged') {
      log.warn('No staged changes. Run `git add <files>` before `autodoc build`.');
    } else {
      log.warn(`No ${diffType} changes found.`);
    }
    process.exit(0);
  }

  // Show changed file count for staged
  if (diffType === 'staged') {
    const files = getStagedFiles();
    log.info(`Found ${files.length} changed file(s) to analyze.`);
  }

  const currentDoc = fs.readFileSync(docFilePath, 'utf8');

  // Run AI analysis
  const provider = getProvider(config.provider);
  console.log(chalk.dim(`\n  Sending to ${config.provider} (${config.model})...\n`));

  const changelogEnabled = !!config.changelog;

  let result;
  try {
    result = await provider.analyze(config.apiKey, config.model, currentDoc, diff, {
      changelog: changelogEnabled,
    });
  } catch (err) {
    log.error(`AI analysis failed: ${err.message}`);
    process.exit(1);
  }

  if (!result.hasChanges) {
    log.success('Documentation is already up to date. No changes needed.');
    return;
  }

  // Display proposed changes
  log.section('Documentation Changes Detected');

  console.log(`  ${chalk.bold('Summary:')} ${result.summary}\n`);

  if (result.sections?.length) {
    console.log(chalk.bold('  Proposed changes:'));
    for (const s of result.sections) {
      log.change(s.type, s.section, s.reason);
    }
    console.log('');
  }

  // Confirm
  let approved = !!options.yes;
  if (!approved) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Apply these changes to ${options.doc || config.docFile}?`,
        default: true,
      },
    ]);
    approved = confirm;
  }

  if (!approved) {
    log.info('Changes not applied.');
    return;
  }

  // Write updated doc
  if (typeof result.updatedDoc !== 'string' || !result.updatedDoc.trim()) {
    log.error('AI returned an empty document. Aborting to avoid overwriting your file.');
    process.exit(1);
  }

  fs.writeFileSync(docFilePath, result.updatedDoc);
  log.success(`Updated ${options.doc || config.docFile}`);

  // Write changelog if enabled and AI returned entries
  if (changelogEnabled && result.changelogEntries) {
    const changelogFile = config.changelogFile || './CHANGELOG.md';
    const changelogPath = path.resolve(process.cwd(), changelogFile);
    const versionBump = detectVersionBump(diff);

    try {
      updateChangelog(changelogPath, result.changelogEntries, versionBump);
      if (versionBump) {
        log.success(
          `Changelog updated → ${changelogFile} (version ${versionBump.oldVersion} → ${versionBump.newVersion})`
        );
      } else {
        log.success(`Changelog updated → ${changelogFile}`);
      }
    } catch (err) {
      log.warn(`Changelog update failed: ${err.message}`);
    }
  }

  const docRelative = options.doc || config.docFile;
  const changelogRelative = changelogEnabled ? config.changelogFile || './CHANGELOG.md' : null;
  const filesToAdd = [docRelative, changelogRelative].filter(Boolean).join(' ');
  console.log(chalk.dim('\n  Next: commit your changes including the updated doc.'));
  console.log(chalk.dim(`  git add ${filesToAdd} && git commit -m "docs: update documentation"\n`));
}

module.exports = { runBuild };
