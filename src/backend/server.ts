import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { setupWebSocketHandlers } from './websocket';

const app = express();

// Middleware
app.use(cors({
  origin: config.allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create HTTP server
const server = app.listen(parseInt(config.port), () => {
  console.log(`Server running on port ${config.port}`);
});

// Create WebSocket server
const wss = new WebSocketServer({ server });
setupWebSocketHandlers(wss);