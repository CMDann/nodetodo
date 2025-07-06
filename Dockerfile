# Use the official Node.js 18 LTS image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S todoapp -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=todoapp:nodejs . .

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown todoapp:nodejs /app/data

# Expose the port the app runs on
EXPOSE 3000

# Switch to non-root user
USER todoapp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/todos.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: process.env.PORT || 3000, path: '/', timeout: 2000 }; \
    const request = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    request.on('error', () => process.exit(1)); \
    request.end();"

# Start the application
CMD ["npm", "start"]