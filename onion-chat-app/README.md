# Ephemeral Onion Chat

Privacy-first anonymous communication system with client-side E2EE, relay-only backend, ephemeral rooms, and optional Tor hidden service support.

## Monorepo Layout

- `client/`: React + Vite frontend
- `server/`: Node.js WebSocket relay backend
- `crypto/`: Shared cryptographic primitives and protocol helpers
- `docs/`: Architecture, Tor setup, deployment, and interview notes

## Quick Start

1. Install dependencies:
   - `cd server && npm install`
   - `cd ../client && npm install`
2. Start backend:
   - `cd ../server && npm run dev`
3. Start frontend:
   - `cd ../client && npm run dev`
4. Open `http://localhost:5173`

## Security Model Summary

- E2EE using ECDH (P-256) + AES-GCM performed client-side
- Server relays encrypted envelopes only
- No user accounts, no persistent identity, no cookies
- In-memory room state only, with message TTL and burn-after-read support
- Optional Tor hidden service for anonymous network access

See `docs/system-design.md` and `docs/tor-hidden-service.md` for full details.
