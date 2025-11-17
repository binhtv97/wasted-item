# Multi-stage Dockerfile for food-waste-tracking

# 1) Builder: install deps, generate Prisma client, build SSR/client bundles
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client (no DB connection required)
RUN npx prisma generate

# Build without triggering npm postbuild (run underlying build tool directly)
RUN npx react-router build


# 2) Runner: production image with only prod deps and build output
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy build output from builder
COPY --from=builder /app/build ./build
# Copy generated Prisma client artifacts from builder to avoid DB env at build
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Optional: copy public assets if needed (already included by build)
# COPY --from=builder /app/public ./public

# Expose the app port
EXPOSE 3000

# Start SSR server (avoid cross-env in start script)
CMD ["npx", "react-router-serve", "./build/server/index.js"]