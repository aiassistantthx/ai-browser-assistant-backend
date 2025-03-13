FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Install TypeScript globally
RUN npm install -g typescript

# Build backend
RUN npx tsc -p tsconfig.backend.json

EXPOSE 3000
CMD ["npm", "start"]