import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  openaiApiKey: string;
  allowedOrigins: string[];
  internalUrl?: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || process.env.RAILWAY_PORT || '3000', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  internalUrl: process.env.RAILWAY_INTERNAL_URL
};