const PROVIDERS = {
  gemini: require('./gemini'),
  groq: require('./groq'),
  openai: require('./openai'),
  anthropic: require('./anthropic'),
};

function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown provider: "${name}". Supported: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }
  return provider;
}

const PROVIDER_META = {
  gemini: { label: 'Google Gemini (free tier available)' },
  groq: { label: 'Groq (free tier available)' },
  openai: { label: 'OpenAI' },
  anthropic: { label: 'Anthropic Claude' },
};

module.exports = { getProvider, PROVIDER_META, PROVIDERS };
