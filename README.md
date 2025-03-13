# AI Browser Assistant Backend

Backend server for the AI Browser Assistant Chrome extension. This server provides WebSocket communication and natural language processing capabilities using LangChain.

## Setup

1. Clone the repository:
```bash
git clone https://github.com/aiassistantthx/ai-browser-assistant-backend.git
cd ai-browser-assistant-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the environment variables in `.env`

5. Build the project:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

## Development

For development with hot-reload:
```bash
npm run dev
```

## Deployment

This project is configured for deployment on Railway. Simply connect your GitHub repository to Railway and it will automatically deploy using the configuration in `railway.json`.

Make sure to set up the following environment variables in Railway:
- `PORT`
- `NODE_ENV`
- `OPENAI_API_KEY`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`

## API Documentation

### WebSocket Events

#### Client -> Server
- `RESTORE_SESSION`: Restore a previous session
  ```json
  { "type": "RESTORE_SESSION", "sessionId": "..." }
  ```
- `EXECUTE_COMMAND`: Execute a natural language command
  ```json
  { "type": "EXECUTE_COMMAND", "command": "...", "taskId": "..." }
  ```

#### Server -> Client
- `SESSION_RESTORED`: Confirmation of session restoration
  ```json
  { "type": "SESSION_RESTORED", "sessionId": "..." }
  ```
- `TASK_PLAN`: Plan generated from the command
  ```json
  { "type": "TASK_PLAN", "taskId": "...", "plan": { "steps": [...] } }
  ```
- `ERROR`: Error message
  ```json
  { "type": "ERROR", "error": "..." }
  ```

### HTTP Endpoints

- `GET /health`: Health check endpoint
  ```json
  { "status": "ok" }
  ```