import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const langChainService = new LangChainService();

// Enable CORS with specific configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Basic route for root path
app.get('/', (req, res) => {
  res.status(200).json({ message: 'AI Browser Assistant API' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    allowedOrigins: config.allowedOrigins,
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000
  });
});

// Connection test endpoint
app.get('/connection-test', (req, res) => {
  const origin = req.headers.origin || 'unknown';
  console.log('Connection test request:', {
    origin,
    headers: req.headers,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.status(200).json({
    status: 'ok',
    message: 'Connection test successful',
    origin: origin,
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = createServer(app);

// Configure WebSocket server with specific path
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
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
  
  console.log('New WebSocket connection:', {
    id: clientId,
    ip: clientIp,
    origin: clientOrigin,
    path: request.url,
    headers: request.headers,
    timestamp: new Date().toISOString()
  });

  // Store client information
  clients.set(clientId, {
    ws,
    ip: clientIp,
    origin: clientOrigin,
    connectedAt: new Date()
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    clientId: clientId,
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', {
        clientId,
        type: data.type,
        timestamp: new Date().toISOString()
      });
      
      switch (data.type) {
        case 'INIT':
          ws.send(JSON.stringify({ 
            type: 'SESSION_INIT',
            sessionId: data.sessionId || clientId
          }));
          break;
          
        case 'ANALYZE_TASK':
          try {
            const taskPlan = await langChainService.createTaskPlan(data.task);
            ws.send(JSON.stringify({
              type: 'TASK_PLAN',
              taskId: Date.now().toString(),
              plan: taskPlan
            }));
          } catch (error) {
            console.error('Task analysis error:', error);
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'Failed to analyze task'
            }));
          }
          break;
          
        case 'BROWSER_STATE':
          // Just log the state update
          console.log('Browser state updated:', {
            clientId,
            url: data.state?.url,
            timestamp: new Date().toISOString()
          });
          break;
          
        default:
          console.log('Unknown message type:', data.type);
          ws.send(JSON.stringify({ 
            type: 'ERROR',
            error: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('Message processing error:', error);
      ws.send(JSON.stringify({ 
        type: 'ERROR',
        error: 'Failed to process message' 
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log('Client disconnected:', {
      id: clientId,
      code,
      reason: reason.toString(),
      timestamp: new Date().toISOString()
    });
    clients.delete(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', {
      clientId,
      error,
      timestamp: new Date().toISOString()
    });
  });
});

// Start the server
const port = parseInt(process.env.PORT || '3000', 10);
server.listen(port, () => {
  console.log(`Server started:`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins: config.allowedOrigins,
    timestamp: new Date().toISOString()
  });
});