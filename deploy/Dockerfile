# Alternative to Render: self-hosted VPS (e.g. Truehost, data kept in Kenya). Build context = repo root.
# docker build -f deploy/Dockerfile -t elite-revision .

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run db:generate -w backend && npm run build -w frontend

# ── API + worker image ──
FROM node:24-alpine AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "backend"]

# ── Static PWA served by Caddy ──
FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
