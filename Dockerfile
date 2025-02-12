# Use official Node.js LTS image for stability and security
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json first (for efficient layer caching)
COPY package*.json ./

# Install production dependencies (ensuring no dev dependencies in prod)
RUN npm ci --only=production

# Copy the rest of the source code
COPY . .

# Ensure necessary directories exist for volumes
RUN mkdir -p /app/logs /app/uploads

# Use environment variables from runtime (.env file will be provided at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Expose the necessary application port
EXPOSE 3000

# Define volumes for persistent data (logs and uploads)
VOLUME ["/app/logs", "/app/uploads"]

# Set a non-root user for better security
RUN adduser -D appuser
USER appuser

# Start the application
CMD ["npm", "start"]
