import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';
import { createServer } from 'http';
import { IncomingMessage } from 'http';
import { URL } from 'url';

const app = express();
const langChainService = new LangChainService();

// Enable CORS for all routes
app.use(cors({
  origin: config.allowedOrigins
}));

app.use(express.json());

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Create HTTP server
const server = createServer(app);

// Configure WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/',
  verifyClient: (info: { origin: string, req: IncomingMessage }, callback) => {
    console.log('Connection attempt from origin:', info.origin);
    console.log('Allowed origins:', config.allowedOrigins);
    
    // For Chrome extensions, origin will be in the format 'chrome-extension://[extension-id]'
    if (info.origin && config.allowedOrigins.includes(info.origin)) {
      console.log('Origin verified successfully');
      callback(true);
    } else {
      console.log('Origin verification failed');
      callback(false, 403, 'Forbidden');
    }
  }
});

// WebSocket error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Connection handling
wss.on('connection', (ws, request) => {
  console.log('Client connected');
  console.log('Client headers:', request.headers);
  console.log('Connected clients:', wss.clients.size);

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
const port = config.port || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Allowed origins:', config.allowedOrigins);
});