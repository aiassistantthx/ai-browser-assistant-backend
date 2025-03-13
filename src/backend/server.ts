import express from 'express';
import { WebSocketServer } from 'ws';
import { LangChainService } from './services/langchain';
import { config } from './config';
import cors from 'cors';
import { createServer } from 'http';

// Error handling for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();

// Basic request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Initialize services
let langChainService: LangChainService | undefined;
try {
  langChainService = new LangChainService();
  console.log('LangChain service initialized successfully');
} catch (error) {
  console.error('Error initializing LangChain service:', error instanceof Error ? error.message : String(error));
}

// Enable CORS - allow all origins for testing
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Basic route for testing
app.get('/test', (req, res) => {
  res.send('Server is running');
});

// Root path
app.get('/', (req, res) => {
  try {
    res.status(200).json({ 
      message: 'AI Browser Assistant API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/test',
        '/health',
        '/connection-test',
        '/ws (WebSocket)'
      ]
    });
  } catch (error) {
    console.error('Error in root path:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000,
      },
      config: {
        allowedOrigins: config.allowedOrigins
      },
      services: {
        langchain: langChainService ? 'initialized' : 'not initialized'
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    console.log('Health check:', health);
    res.status(200).json(health);
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Connection test endpoint
app.get('/connection-test', (req, res) => {
  try {
    const origin = req.headers.origin || 'unknown';
    const requestInfo = {
      origin,
      headers: req.headers,
      ip: req.ip,
      timestamp: new Date().toISOString()
    };
    
    console.log('Connection test request:', requestInfo);
    res.status(200).json({
      status: 'ok',
      message: 'Connection test successful',
      request: requestInfo
    });
  } catch (error) {
    console.error('Error in connection test:', error);
    res.status(500).json({ error: 'Connection test failed' });
  }
});

// Create HTTP server
const server = createServer(app);

// Configure WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
  clientTracking: true,
  perMessageDeflate: false
});

// Track connected clients
const clients = new Map();

// WebSocket server error handling
wss.on('error', (error: Error) => {
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
  try {
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      clientId: clientId,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error sending welcome message:', error instanceof Error ? error.message : String(error));
  }

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
          if (!langChainService) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'LangChain service is not available'
            }));
            break;
          }
          
          try {
            const taskPlan = await langChainService.createTaskPlan(data.task);
            ws.send(JSON.stringify({
              type: 'TASK_PLAN',
              taskId: Date.now().toString(),
              plan: taskPlan
            }));
          } catch (error) {
            console.error('Task analysis error:', error instanceof Error ? error.message : String(error));
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: `Failed to analyze task: ${error instanceof Error ? error.message : String(error)}`
            }));
          }
          break;
          
        case 'BROWSER_STATE':
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
      console.error('Message processing error:', error instanceof Error ? error.message : String(error));
      try {
        ws.send(JSON.stringify({ 
          type: 'ERROR',
          error: `Failed to process message: ${error instanceof Error ? error.message : String(error)}`
        }));
      } catch (sendError) {
        console.error('Error sending error message:', sendError instanceof Error ? sendError.message : String(sendError));
      }
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
  ws.on('error', (error: Error) => {
    console.error('WebSocket client error:', {
      clientId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
});

// Start the server
const port = parseInt(process.env.PORT || '3000', 10);

try {
  server.listen(port, () => {
    const serverInfo = {
      port,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    console.log('Server started:', serverInfo);
    console.log('Configuration:', {
      allowedOrigins: config.allowedOrigins,
      services: {
        langchain: langChainService ? 'initialized' : 'not initialized'
      }
    });
  });

  server.on('error', (error: Error) => {
    console.error('Server error:', {
      error: error.message,
      code: (error as any).code,
      syscall: (error as any).syscall,
      port: (error as any).port,
      timestamp: new Date().toISOString()
    });
  });
} catch (error) {
  console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}