# Multi-stage Docker build for Next.js application optimized for GCP Cloud Run
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# Install all dependencies including devDependencies for build stage
#RUN npm ci || npm ci --legacy-peer-deps
RUN npm install --legacy-peer-deps

# Install Cloud SQL Proxy for secure database connections
RUN wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
RUN chmod +x cloud_sql_proxy

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for linux-musl-openssl-3.0.x (Alpine Linux)
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx prisma generate --schema=./prisma/attachments-schema.prisma

# Build the application with proper NODE_ENV
ENV NODE_ENV=production
RUN npm run build

# Production dependencies
FROM base AS production-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm ci --omit=dev --legacy-peer-deps
RUN npm cache clean --force

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install Cloud SQL Proxy
RUN apk add --no-cache wget
RUN wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy
RUN chmod +x /usr/local/bin/cloud_sql_proxy

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy production dependencies
COPY --from=production-deps /app/node_modules ./node_modules

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy Cloud SQL Proxy from deps stage
COPY --from=deps /app/cloud_sql_proxy /usr/local/bin/

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application with the startup script
CMD ["./start.sh"]
