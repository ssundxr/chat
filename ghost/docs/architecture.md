# Black Mamba Architecture

## Overview

Black Mamba is a terminal-first ephemeral chat system built around three layers:

1. CLI runtime for boot, menus, and chat UX
2. Relay-only WebSocket server for room transport
3. Shared protocol and crypto helpers for ECDH + AES-GCM message exchange

## Runtime flow

1. User launches `black-mamba`.
2. CLI startup clears the terminal and prints the Black Mamba ASCII logo first.
3. A session ECDH keypair is generated for the current process only.
4. The user creates or joins a room.
5. The CLI opens a WebSocket connection to the relay server.
6. Peers exchange public keys through relay messages.
7. Each sender derives per-recipient AES-256-GCM keys from ECDH + HKDF-SHA-256.
8. Messages are sent as encrypted envelopes only.
9. ACKs are used for burn-after-read cleanup.
10. TTL cleanup removes inactive rooms and expired pending messages.

## Security properties

- No accounts
- No usernames stored
- No persistent identity
- No plaintext on the server
- No filesystem writes at runtime
- Replay protection via UUID v4 message IDs
- Room size and message rate limits enforced server-side

## Terminal UX

- ASCII logo and boot logs appear before any interactive prompt
- Main menu supports create/join/quit
- Chat view is scrollable and input-driven
- Peer fingerprints are shown to support manual verification

## Deployment

- Run the relay server directly with Node.js
- Package the server in Docker using the root Dockerfile
- Install the CLI globally as `black-mamba`
