# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client and build TypeScript
RUN npx prisma generate && npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy package files and install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/logistics.db

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
