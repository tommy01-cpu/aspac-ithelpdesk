# Multi-stage Docker build for Next.js application optimized for GCP Cloud Run
FROM node:18-alpine AS base

# Install common dependencies and OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl ca-certificates

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache wget curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# Clear npm cache and install dependencies
RUN npm cache clean --force \
    && npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Verify installation
RUN npm list --depth=0 || echo "Checking installed packages..."

# Install Cloud SQL Proxy for secure database connections
RUN echo "Downloading Cloud SQL Proxy..." \
    && wget --timeout=30 --tries=3 https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy \
    && chmod +x cloud_sql_proxy \
    && echo "Cloud SQL Proxy downloaded successfully"

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for Prisma generation
ENV SKIP_ENV_VALIDATION=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV ATTACHMENTS_DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Ensure Prisma binary compatibility
RUN npm list prisma @prisma/client || echo "Checking Prisma versions..."

# Generate Prisma client for linux-musl-openssl-3.0.x (Alpine Linux)
RUN echo "Generating Prisma clients..." \
    && npx prisma generate --schema=./prisma/schema.prisma \
    && npx prisma generate --schema=./prisma/attachments-schema.prisma \
    && echo "Prisma generation completed"

# Build the application with proper NODE_ENV
ENV NODE_ENV=production
RUN echo "Starting Next.js build..." \
    && npm run build \
    && echo "Build completed"

# Verify build output
RUN ls -la .next/ && ls -la .next/standalone/ || echo "Checking build structure..."

# Production dependencies
FROM base AS production-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps
RUN npm cache clean --force

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install Cloud SQL Proxy (avoid duplicate installation)
RUN echo "Installing Cloud SQL Proxy in runner stage..." \
    && apk add --no-cache wget curl \
    && wget --timeout=30 --tries=3 https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy \
    && chmod +x /usr/local/bin/cloud_sql_proxy \
    && echo "Cloud SQL Proxy installed successfully"

# Create necessary directories
RUN mkdir -p .next/static

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy production dependencies
COPY --from=production-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy startup script
COPY --chown=nextjs:nodejs start.sh ./
RUN chmod +x start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application with the startup script
CMD ["./start.sh"]
