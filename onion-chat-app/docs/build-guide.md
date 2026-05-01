# Build Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Linux/macOS/Windows

## 1. Clone and install

~~~bash
cd onion-chat-app/server
npm install

cd ../client
npm install
~~~

## 2. Configure environment

Server:

~~~bash
cd ../server
cp .env.example .env
~~~

Client:

~~~bash
cd ../client
cp .env.example .env
~~~

## 3. Run development stack

Terminal 1:

~~~bash
cd onion-chat-app/server
npm run dev
~~~

Terminal 2:

~~~bash
cd onion-chat-app/client
npm run dev
~~~

Open http://localhost:5173.

## 4. Production build

~~~bash
cd onion-chat-app/server
npm run build

cd ../client
npm run build
~~~

Serve:

- Backend: node server/dist/index.js
- Frontend: static files from client/dist via Nginx/Caddy

## 5. Operational privacy settings

- Keep backend memory-only (default)
- Disable access logs at proxy level
- Route traffic over TLS and optionally Tor
- Set strict retention windows (TTL)

## 6. Basic validation scenario

1. Open two browser windows on same room.
2. Verify peer count > 0.
3. Send message from window A.
4. Confirm window B receives readable plaintext.
5. Confirm relay still never sees plaintext by inspecting backend code path.
6. Enable burn-after-read and verify messages disappear after recipient ack.
7. Trigger Session Reset and confirm messaging continues with new keys.
