const { execSync } = require('child_process');

function exec(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function isGitRepo() {
  try {
    exec('git rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

function getDiff(type = 'staged') {
  const cmds = {
    staged: 'git diff --staged',
    'last-commit': 'git diff HEAD~1 HEAD',
    working: 'git diff',
  };

  const cmd = cmds[type];
  if (!cmd) throw new Error(`Unknown diff type: "${type}". Use: staged, last-commit, working`);

  try {
    return exec(cmd);
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. AutoDoc requires git.');
    }
    // last-commit fails on repos with only one commit
    if (type === 'last-commit' && err.message.includes('unknown revision')) {
      throw new Error('No previous commit to diff against. Try --diff working');
    }
    throw err;
  }
}

function getStagedFiles() {
  return exec('git diff --staged --name-only').trim().split('\n').filter(Boolean);
}

module.exports = { isGitRepo, getDiff, getStagedFiles };
