import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const langChainService = new LangChainService();

// Enable CORS
app.use(cors({
  origin: '*', // Temporarily allow all origins for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    allowedOrigins: config.allowedOrigins,
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// Add connection test endpoint
app.get('/connection-test', (req, res) => {
  const origin = req.headers.origin || 'unknown';
  console.log('Connection test from origin:', origin);
  
  if (origin === 'unknown' || config.allowedOrigins.includes(origin)) {
    res.status(200).json({
      status: 'ok',
      message: 'Connection test successful',
      origin: origin,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(403).json({
      status: 'error',
      message: 'Origin not allowed',
      origin: origin,
      allowedOrigins: config.allowedOrigins
    });
  }
});

// Create HTTP server
const server = createServer(app);

// Configure WebSocket server
const wss = new WebSocketServer({ 
  server,
  clientTracking: true,
  perMessageDeflate: false
});

// Track connected clients
const clients = new Map();

// WebSocket server error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Connection handling
wss.on('connection', (ws, request) => {
  const clientId = Date.now().toString();
  const clientIp = request.socket.remoteAddress || 'unknown';
  const clientOrigin = request.headers.origin || 'unknown';
  
  console.log('New client connected:', {
    id: clientId,
    ip: clientIp,
    origin: clientOrigin,
    timestamp: new Date().toISOString()
  });

  // Store client information
  clients.set(clientId, {
    ws,
    ip: clientIp,
    origin: clientOrigin,
    connectedAt: new Date()
  });

  console.log('Total connected clients:', clients.size);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    clientId: clientId,
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      console.log('Received message from client', clientId + ':', message.toString());
      const data = JSON.parse(message.toString());
      
      if (data.type === 'INIT') {
        console.log('Received INIT message with sessionId:', data.sessionId);
        ws.send(JSON.stringify({ 
          type: 'SESSION_INIT',
          sessionId: data.sessionId || clientId
        }));
        return;
      }
      
      if (data.type === 'ANALYZE_TASK') {
        console.log('Analyzing task:', data.task);
        try {
          const taskPlan = await langChainService.createTaskPlan(data.task);
          ws.send(JSON.stringify({
            type: 'TASK_PLAN',
            taskId: Date.now().toString(),
            plan: taskPlan
          }));
        } catch (error) {
          console.error('Error creating task plan:', error);
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Failed to create task plan'
          }));
        }
        return;
      }

      if (data.type === 'BROWSER_STATE') {
        console.log('Received browser state update from client', clientId);
        return;
      }

      console.log('Unknown message type:', data.type);
      ws.send(JSON.stringify({ 
        type: 'ERROR',
        error: 'Unknown message type' 
      }));
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ 
        type: 'ERROR',
        error: 'Failed to process message' 
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected:', clientId);
    clients.delete(clientId);
    console.log('Remaining clients:', clients.size);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket client error:', clientId, error);
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Allowed origins:', config.allowedOrigins);
});