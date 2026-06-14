const chalk = require('chalk');

const ICONS = { info: 'ℹ', success: '✓', warn: '⚠', error: '✗' };

const log = {
  info: (msg) => console.log(chalk.blue(ICONS.info), msg),
  success: (msg) => console.log(chalk.green(ICONS.success), msg),
  warn: (msg) => console.log(chalk.yellow(ICONS.warn), msg),
  error: (msg) => console.error(chalk.red(ICONS.error), msg),

  section(title) {
    const bar = chalk.bold.cyan('─'.repeat(52));
    console.log(`\n${bar}`);
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(`${bar}\n`);
  },

  change(type, section, reason) {
    const styles = {
      add: { icon: '+', color: chalk.green, label: 'ADD' },
      remove: { icon: '-', color: chalk.red, label: 'REMOVE' },
      update: { icon: '~', color: chalk.yellow, label: 'UPDATE' },
    };
    const s = styles[type] || styles.update;
    console.log(`  ${s.color(s.icon)} ${s.color.bold(`[${s.label}]`)} ${chalk.bold(section)}`);
    console.log(`    ${chalk.dim(reason)}`);
  },
};

module.exports = { log };
