# Black Mamba

Black Mamba is a CLI-first ephemeral chat system with client-side end-to-end encryption, relay-only WebSocket transport, and no identity persistence.

## Install

```bash
cd ghost
npm install
npm run build
```

## Run the CLI

```bash
npm run dev:cli
```

Or after building:

```bash
node dist/cli/index.js
```

If published, install globally:

```bash
npm install -g black-mamba
black-mamba
```

## Run the relay server

```bash
npm run dev:server
```

## Security model

- ECDH P-256 for session key agreement
- HKDF-SHA-256 for AES key derivation
- AES-256-GCM for message encryption
- Server never sees plaintext
- In-memory room state only
- Duplicate message IDs are rejected
- TTL cleanup and burn-after-read are enforced

## Layout

- `cli/` terminal app and crypto helpers
- `server/` relay-only WebSocket service
- `shared/` protocol and type definitions
- `docs/` architecture notes
