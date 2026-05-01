# Tor Hidden Service Setup

## 1. Install Tor

Ubuntu/Debian:

~~~bash
sudo apt update
sudo apt install tor
~~~

Windows:

- Install Tor Expert Bundle or Tor Browser package
- Ensure tor executable and torrc are available

## 2. Configure hidden service

Edit torrc (often /etc/tor/torrc):

~~~conf
HiddenServiceDir /var/lib/tor/onion_chat_hidden_service/
HiddenServiceVersion 3
HiddenServicePort 80 127.0.0.1:8080
~~~

This maps onion port 80 to local backend port 8080.

Restart Tor:

~~~bash
sudo systemctl restart tor
~~~

Get onion address:

~~~bash
sudo cat /var/lib/tor/onion_chat_hidden_service/hostname
~~~

## 3. Expose backend via .onion

Run backend bound to localhost or private interface:

~~~bash
cd onion-chat-app/server
HOST=127.0.0.1 PORT=8080 npm run start
~~~

Users can then connect via:

- ws://yourservice.onion/ws (inside Tor Browser context)

## 4. Frontend over Tor

Option A (recommended): host frontend as a second hidden service.

Option B: host frontend on clearnet but point WebSocket endpoint to onion URL.

Set client env:

~~~bash
VITE_WS_URL=ws://yourservice.onion/ws
~~~

## 5. Tor security considerations

- Use Tor Browser to avoid DNS leaks and proxy bypass
- Avoid mixed clearnet/onion content on same page
- Disable analytics scripts and third-party assets
- Keep server clock synchronized for TLS/session consistency
- Use separate hidden services for frontend and backend isolation
- Keep hidden service private key protected and backed up securely
- Understand Tor hides network origin, not endpoint malware risk
