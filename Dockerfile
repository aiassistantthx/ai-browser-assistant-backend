FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and config files
COPY . .

# Debug: List files to verify they were copied
RUN ls -la
RUN cat tsconfig.backend.json

# Install TypeScript globally
RUN npm install -g typescript

# Build backend
RUN npx tsc -p tsconfig.backend.json

EXPOSE 3000
CMD ["npm", "start"]