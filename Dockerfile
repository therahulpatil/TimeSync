# ==========================================
# Stage 1: Build Frontend (Vite + React)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app/client

# Copy frontend package manifests and install
COPY client/package*.json ./
RUN npm install

# Copy frontend source and build production bundle
COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copy backend package manifests and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./server

# Copy built frontend assets from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Create persistent data directory for SQLite database
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3000

# Health check to ensure service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server/index.js"]
