import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { config } from './config';
import { setupWebSocketHandlers } from './websocket';
import { healthRouter } from './routes/health';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors({
  origin: config.allowedOrigins,
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Routes
app.use('/health', healthRouter);

// WebSocket setup
setupWebSocketHandlers(wss);

// Start server
server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});