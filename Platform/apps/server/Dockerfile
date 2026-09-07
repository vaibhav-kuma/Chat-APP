# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first for layer caching
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --workspace @platform/server --include-workspace-root=false

# Copy server source + build
COPY apps/server ./apps/server
RUN npx prisma generate --schema apps/server/prisma/schema.prisma
RUN npm run build --workspace @platform/server

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps (server workspace)
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --omit=dev --workspace @platform/server --include-workspace-root=false

# Copy build output + prisma schema/migrations, then generate the client for this runtime
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
RUN npx prisma generate --schema apps/server/prisma/schema.prisma

WORKDIR /app/apps/server
EXPOSE 4000

# Run migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
