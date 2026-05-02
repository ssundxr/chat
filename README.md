# Onion Chat : Black Mamba

A high-performance, ephemeral, CLI-based chat tool with E2E encryption.

##  Quick Install (Direct)

Get up and running in seconds. Choose your environment:

### Linux / macOS
```bash
curl -sSL https://raw.githubusercontent.com/ssundxr/chat/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
iwr https://raw.githubusercontent.com/ssundxr/chat/main/install.ps1 -useb | iex
```

Once installed, just run:
```bash
black-mamba
```

---

## 🛠 Manual Installation

If you prefer to install via NPM globally:

```bash
npm install -g onion-chat-mamba
black-mamba
```

## 🔒 Security
- **ECDH P-256** session key agreement.
- **AES-256-GCM** message encryption.
- **No Identity Persistence**: No accounts, no logs, no trace.

For full documentation, see the [ghost/](ghost/) directory.
