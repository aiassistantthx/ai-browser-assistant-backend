import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';
import { IncomingMessage } from 'http';
import { URL } from 'url';

const app = express();
const langChainService = new LangChainService();

app.use(cors({
  origin: config.allowedOrigins
}));

app.use(express.json());

const server = app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  console.log('Allowed origins:', config.allowedOrigins);
});

const wss = new WebSocketServer({ 
  server,
  verifyClient: (info: { origin: string, req: IncomingMessage }) => {
    console.log('Connection attempt from origin:', info.origin);
    
    // For Chrome extensions, origin will be in the format 'chrome-extension://[extension-id]'
    if (info.origin && config.allowedOrigins.includes(info.origin)) {
      console.log('Origin verified successfully');
      return true;
    }
    
    console.log('Origin verification failed');
    return false;
  }
});

wss.on('connection', (ws, request) => {
  console.log('Client connected');
  console.log('Client headers:', request.headers);

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
        const taskPlan = await langChainService.createTaskPlan(data.task);
        ws.send(JSON.stringify({
          type: 'TASK_PLAN',
          taskId: Date.now().toString(),
          plan: taskPlan
        }));
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
        error: 'Failed to process command' 
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});