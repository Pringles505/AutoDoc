#!/usr/bin/env node

require('dotenv').config();

const { program } = require('commander');
const pkg = require('../package.json');

program
  .name('autodoc')
  .description('Auto-generate documentation from git changes using AI')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize AutoDoc in the current project')
  .action(() => require('../src/commands/init').runInit());

program
  .command('build')
  .description('Analyze staged changes and update documentation')
  .option('-y, --yes', 'Auto-approve all changes without prompting')
  .option('--diff <type>', 'What to diff: staged (default), last-commit, or working', 'staged')
  .option('--doc <path>', 'Override the doc file path from config')
  .action((options) => require('../src/commands/build').runBuild(options));

program.parse();
