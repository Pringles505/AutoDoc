const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.autodocrc';

const ENV_KEYS = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

function findConfigPath(dir = process.cwd()) {
  const candidate = path.join(dir, CONFIG_FILE);
  if (fs.existsSync(candidate)) return candidate;
  const parent = path.dirname(dir);
  if (parent === dir) return null;
  return findConfigPath(parent);
}

function loadConfig() {
  const configPath = findConfigPath();
  if (!configPath) return null;
  try {
    return { ...JSON.parse(fs.readFileSync(configPath, 'utf8')), _path: configPath };
  } catch {
    throw new Error(`Failed to parse ${configPath} — is it valid JSON?`);
  }
}

function saveConfig(config, dir = process.cwd()) {
  const configPath = path.join(dir, CONFIG_FILE);
  const { _path, ...clean } = config;
  fs.writeFileSync(configPath, JSON.stringify(clean, null, 2) + '\n');
  return configPath;
}

function getConfig() {
  const config = loadConfig();
  if (!config) {
    throw new Error('No .autodocrc found. Run `autodoc init` first.');
  }

  // Resolve API key from env if not in config
  if (!config.apiKey) {
    config.apiKey =
      process.env.AUTODOC_API_KEY ||
      (config.provider && process.env[ENV_KEYS[config.provider]]) ||
      null;
  }

  return config;
}

module.exports = { loadConfig, saveConfig, getConfig, CONFIG_FILE };
