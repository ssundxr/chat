# Deployment (AWS / Azure Compatible)

## Deployment model

- Stateless WebSocket relay service
- Static frontend hosting
- Optional reverse proxy + TLS
- Optional Tor sidecar or host-level Tor service

## Container example

### Server Dockerfile

~~~dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
CMD ["node", "dist/index.js"]
~~~

## AWS reference

- Frontend: S3 + CloudFront or ECS-served static files
- Backend: ECS/Fargate service behind ALB (WebSocket enabled)
- Logging: structured operational logs only, no client identifiers
- Secrets: AWS Secrets Manager for runtime env vars

## Azure reference

- Frontend: Azure Static Web Apps or Blob Static Website + CDN
- Backend: Azure Container Apps or App Service (WebSocket enabled)
- Secrets: Azure Key Vault + managed identity

## Edge proxy recommendations

- Enforce TLS 1.2+
- Add strict CSP, X-Frame-Options, Referrer-Policy
- Disable access logs or anonymize source IP
- Rate limit connection bursts per edge node

## Runtime configuration

Server env:

- PORT
- HOST
- CORS_ORIGIN
- ROOM_TTL_SECONDS
- DEFAULT_MESSAGE_TTL_SECONDS

Client env:

- VITE_WS_URL
- VITE_DEFAULT_TTL_SECONDS

## Post-deployment verification

1. WebSocket connectivity from multiple clients
2. End-to-end decryption success in client only
3. Server memory cleanup working (TTL and empty room eviction)
4. No plaintext in relay logs or storage
5. Tor endpoint reachable from Tor Browser
