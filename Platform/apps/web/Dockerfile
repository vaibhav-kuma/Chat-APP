# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --workspace @platform/web --include-workspace-root=false

COPY apps/web ./apps/web
RUN npm run build --workspace @platform/web

# ---- Runtime stage (nginx) ----
FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
