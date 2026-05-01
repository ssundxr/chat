# Interview Playbook

## 1. 30-second project pitch

Ephemeral Onion Chat is an anonymous communication system that enforces privacy by design. It has no accounts, no persistent identity, and no plaintext visibility on the server. Every message is encrypted client-side using ECDH key exchange and AES-GCM, then relayed as ciphertext envelopes over WebSockets. Rooms and messages are ephemeral with short TTL and optional burn-after-read behavior, and the backend can be exposed as a Tor hidden service for network anonymity.

## 2. Technical highlights to mention

- Security-first architecture: relay server cannot decrypt messages
- Browser-native crypto protocol with ephemeral per-session keys
- Metadata minimization: in-memory only state, no user database
- Operational privacy posture: no cookies, no analytics, reduced logs
- Real-time transport with WebSocket and optional WebRTC evolution path
- Tor compatibility for privacy-sensitive use cases

## 3. Trade-off discussion points

- Group chats require one encrypted envelope per recipient (simplicity vs scalability)
- No persistent history improves privacy but reduces convenience
- Tor improves anonymity but can increase latency
- No accounts means less abuse resistance; moderation needs separate controls

## 4. Senior-level design choices

- Chose explicit protocol over security-through-obscurity
- Encoded retention policy into runtime behavior (TTL + burn mode)
- Separated crypto utilities for auditability and future formal verification
- Kept backend stateless and horizontally scalable

## 5. Future roadmap

1. Safety number verification UX and out-of-band key confirmation
2. Optional WebRTC direct mode after encrypted signaling
3. Stronger abuse protections that preserve anonymity
4. Cryptographic transcript proofs for tamper-evident client logs
