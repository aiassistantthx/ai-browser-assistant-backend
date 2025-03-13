FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (for documentation, Railway will override this)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]