import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const langChainService = new LangChainService();

// Enable CORS with WebSocket support
app.use(cors({
  origin: config.allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    allowedOrigins: config.allowedOrigins
  });
});

// Create HTTP server
const server = createServer(app);

// Configure WebSocket server
const wss = new WebSocketServer({ 
  server,
  clientTracking: true,
  perMessageDeflate: false // Disable compression for Railway proxy compatibility
});

// WebSocket server error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Connection handling
wss.on('connection', (ws, request) => {
  const clientIp = request.socket.remoteAddress;
  const clientOrigin = request.headers.origin;
  
  console.log('New client connected');
  console.log('Client IP:', clientIp);
  console.log('Client Origin:', clientOrigin);
  console.log('Total connected clients:', wss.clients.size);
  console.log('Request headers:', request.headers);

  // Send immediate welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      console.log('Received message:', message.toString());
      const data = JSON.parse(message.toString());
      
      if (data.type === 'INIT') {
        console.log('Received INIT message with sessionId:', data.sessionId);
        ws.send(JSON.stringify({ 
          type: 'SESSION_INIT',
          sessionId: data.sessionId || Date.now().toString()
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
        console.log('Received browser state update');
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
    console.log('Client disconnected');
    console.log('Remaining clients:', wss.clients.size);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket client error:', error);
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Allowed origins:', config.allowedOrigins);
});