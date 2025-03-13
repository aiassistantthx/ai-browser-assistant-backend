import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: string;
  nodeEnv: string;
  openaiApiKey: string;
  jwtSecret: string;
  allowedOrigins: string[];
  internalUrl: string;
}

export const config: Config = {
  port: process.env.PORT || process.env.RAILWAY_PORT || '3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  internalUrl: process.env.RAILWAY_INTERNAL_URL || 'localhost:3000'
};