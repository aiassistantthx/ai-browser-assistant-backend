import { WebSocketServer, WebSocket } from 'ws';
import { LangChainService } from './services/langchain';

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  command?: string;
  taskId?: string;
}

export function setupWebSocketHandlers(wss: WebSocketServer) {
  const langchainService = new LangChainService();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');
    let sessionId: string | undefined;

    ws.on('message', async (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        console.log('Received:', message);

        switch (message.type) {
          case 'RESTORE_SESSION':
            sessionId = message.sessionId;
            ws.send(JSON.stringify({ type: 'SESSION_RESTORED', sessionId }));
            break;

          case 'EXECUTE_COMMAND':
            if (!message.command) {
              throw new Error('Command is required');
            }
            const taskId = message.taskId || Date.now().toString();
            const plan = await langchainService.createTaskPlan(message.command);
            ws.send(JSON.stringify({ type: 'TASK_PLAN', taskId, plan }));
            break;

          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ 
          type: 'ERROR', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}