import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';

const app = express();
const langChainService = new LangChainService();

app.use(cors({
  origin: config.allowedOrigins
}));

app.use(express.json());

const server = app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const taskPlan = await langChainService.createTaskPlan(data.command);
      ws.send(JSON.stringify(taskPlan));
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Failed to process command' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});