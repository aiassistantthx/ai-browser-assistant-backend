interface Config {
  port: number;
  allowedOrigins: string[];
  openaiApiKey: string;
}

export const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  allowedOrigins: [
    'chrome-extension://inicnhlabgfgjjdggmelpibndogdmpki',
    'https://ai-browser-assistant-backend-production.up.railway.app:8080'
  ],
  openaiApiKey: process.env.OPENAI_API_KEY || ''
};

if (!config.openaiApiKey) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set');
}