const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { saveConfig, loadConfig, CONFIG_FILE } = require('../config');
const { PROVIDER_META, PROVIDERS } = require('../providers');
const { log } = require('../ui');

async function runInit() {
  console.log(chalk.bold.cyan('\n  AutoDoc — Init\n'));

  const existing = loadConfig();
  if (existing) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `${CONFIG_FILE} already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      log.info('Init cancelled.');
      return;
    }
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which AI provider?',
      choices: Object.entries(PROVIDER_META).map(([value, { label }]) => ({
        name: label,
        value,
      })),
    },
    {
      type: 'input',
      name: 'model',
      message: (a) => `Model (default: ${PROVIDERS[a.provider].DEFAULT_MODEL}):`,
      default: (a) => PROVIDERS[a.provider].DEFAULT_MODEL,
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API key (leave blank to use an environment variable):',
      mask: '*',
    },
    {
      type: 'input',
      name: 'docFile',
      message: 'Path to your documentation file:',
      default: './docs/doc.md',
      validate: (v) => (v.trim() ? true : 'Path is required'),
    },
    {
      type: 'confirm',
      name: 'createDoc',
      message: (a) => `${a.docFile} does not exist. Create it with a starter template?`,
      default: true,
      when: (a) => !fs.existsSync(path.resolve(process.cwd(), a.docFile)),
    },
  ]);

  const config = {
    provider: answers.provider,
    model: answers.model,
    docFile: answers.docFile,
  };

  if (answers.apiKey) {
    config.apiKey = answers.apiKey;
  }

  // Create doc file if requested
  if (answers.createDoc) {
    const docPath = path.resolve(process.cwd(), answers.docFile);
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    fs.writeFileSync(
      docPath,
      [
        '# Project Documentation',
        '',
        '> Maintained by [AutoDoc](https://github.com/your-org/autodoc-cli).',
        '',
        '## Overview',
        '',
        'Describe your project here.',
        '',
        '## Installation',
        '',
        '```bash',
        '# installation steps',
        '```',
        '',
        '## Usage',
        '',
        'Describe how to use the project.',
        '',
        '## API',
        '',
        'Document your API, functions, or configuration options here.',
        '',
        '## Changelog',
        '',
        '- Initial documentation.',
        '',
      ].join('\n')
    );
    log.success(`Created ${answers.docFile}`);
  }

  const configPath = saveConfig(config);
  log.success(`Config saved → ${configPath}`);

  // Warn if API key is stored in config (gitignore reminder)
  if (answers.apiKey) {
    console.log('');
    log.warn(`Your API key is stored in ${CONFIG_FILE}.`);
    console.log(
      chalk.dim(`  Add ${CONFIG_FILE} to .gitignore to avoid committing it:\n`) +
        chalk.dim(`    echo ".autodocrc" >> .gitignore\n`) +
        chalk.dim(`  Or remove "apiKey" from .autodocrc and set the env var instead:\n`) +
        chalk.dim(`    export ${getEnvKey(answers.provider)}=your_key`)
    );
  }

  console.log('');
  console.log(chalk.bold('  Next steps:'));
  console.log(chalk.dim('  1. Make your code changes'));
  console.log(chalk.dim('  2. Stage them with: git add .'));
  console.log(chalk.dim('  3. Run: autodoc build'));
  console.log(chalk.dim('  4. Approve the doc changes, then commit & push\n'));
}

function getEnvKey(provider) {
  const map = {
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
  };
  return map[provider] || 'AUTODOC_API_KEY';
}

module.exports = { runInit };
