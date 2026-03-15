# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Astro standalone server output
COPY --from=build /app/dist ./dist
# Data files are read at runtime
COPY --from=build /app/data ./data

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
