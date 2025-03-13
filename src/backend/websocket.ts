import { WebSocketServer, WebSocket } from 'ws';
import { LangChainService } from './services/langchain';

export function setupWebSocketHandlers(wss: WebSocketServer) {
  const langchainService = new LangChainService();

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'CREATE_TASK_PLAN') {
          const taskPlan = await langchainService.createTaskPlan(data.command);
          ws.send(JSON.stringify({ type: 'TASK_PLAN_CREATED', plan: taskPlan }));
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to process request' }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}