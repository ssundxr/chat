# Ephemeral Onion Chat - System Design

## 1. Product Objective

Build an anonymous communication platform with strong privacy defaults:

- No accounts
- No long-lived identity
- Client-side end-to-end encryption
- Relay-only backend
- Optional Tor hidden service for network anonymity

## 2. Core Components

1. Frontend (React + Vite)
- Creates ephemeral per-room ECDH key pair in browser
- Derives shared symmetric key per peer
- Encrypts plaintext locally with AES-GCM

2. Backend (Node.js + WebSocket)
- Maintains in-memory room membership and temporary encrypted envelopes
- Relays encrypted packets only
- No plaintext processing

3. Crypto Layer
- ECDH P-256 key agreement
- AES-256-GCM message encryption
- Session reset regenerates ephemeral key pair

4. Optional Networking Upgrade
- WebRTC data channels can be introduced for direct peer messaging after key bootstrap over WebSocket

5. Tor Access Layer
- Expose backend on localhost and publish through Tor hidden service

## 3. Threat Model and Security Goals

Security goals:

- Confidentiality against relay compromise (server sees ciphertext)
- Forward privacy per session via key resets
- Reduced metadata retention via in-memory TTL and burn mode

Out-of-scope (must be communicated to users):

- Endpoint compromise (malware, keylogger)
- Global traffic analysis by nation-state adversaries
- Side-channel leaks outside app scope

## 4. Data Flow

1. User opens a room link.
2. Client generates ephemeral ECDH key pair.
3. Client sends public key + room join event.
4. Peers exchange public keys through relay.
5. Sender derives per-peer AES-GCM keys and encrypts one envelope per recipient.
6. Relay forwards encrypted envelope to recipient.
7. Recipient decrypts locally and sends delivery ack.
8. Burn-after-read removes message from relay cache once recipients acknowledge.
9. TTL sweep purges expired envelopes and inactive rooms.

## 5. Metadata Minimization Strategy

Stored in memory only:

- Room ID
- Anonymous client IDs
- Public keys
- Encrypted envelopes with TTL

Not stored:

- Plaintext messages
- User accounts
- Passwords
- Device fingerprints
- Long-term logs with user identifiers

## 6. Text Architecture Diagram

~~~text
+-------------------------------+     WSS (ciphertext envelopes)     +------------------------------+
| Browser Client A              | <--------------------------------> | Node.js WebSocket Relay      |
| - ECDH keypair (ephemeral)    |                                    | - Room membership in memory  |
| - AES-GCM encryption/decrypt  |                                    | - TTL / burn-after-read      |
+-------------------------------+                                    | - No plaintext visibility    |
         ^                                                            +---------------+--------------+
         | encrypted envelopes only                                                   |
         |                                                                            |
+-------------------------------+     WSS (ciphertext envelopes)                      |
| Browser Client B              | <----------------------------------------------------+
| - ECDH keypair (ephemeral)    |
| - AES-GCM encryption/decrypt  |
+-------------------------------+

Optional network anonymity:
Browser (Tor) -> .onion hidden service -> localhost:8080 relay
~~~

## 7. Security Hardening Checklist

- Strict origin allowlist for WebSocket handshake
- Disable reverse proxy access logs or scrub IPs
- Use short TTL defaults (300-600 seconds)
- Rate limit at edge proxy (Nginx/Caddy)
- Add CSP and secure headers on frontend host
- Rotate room session keys using Session Reset
- Keep dependencies patched and pinned

## 8. Future Enhancements

- WebRTC P2P channel after initial signaling
- Post-quantum KEM hybrid mode for key exchange
- Safety number verification UX for MITM resistance
- Optional blinded room tokens for metadata resistance
