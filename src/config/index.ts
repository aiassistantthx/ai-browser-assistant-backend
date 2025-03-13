import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  openaiApiKey: string;
  jwtSecret: string;
  allowedOrigins: string[];
  langchainVerbose: boolean;
  langchainHandler: string;
  internalUrl: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || process.env.RAILWAY_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'your-default-secret',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(','),
  langchainVerbose: process.env.LANGCHAIN_VERBOSE === 'true',
  langchainHandler: process.env.LANGCHAIN_HANDLER || 'langchain',
  internalUrl: process.env.RAILWAY_INTERNAL_URL || 'localhost:3000'
};