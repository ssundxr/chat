# GitHub Actions Setup Checklist

## Quick Setup for CI/CD Deployment

### 1. EC2 Instance Ready?
- [ ] EC2 instance launched (Amazon Linux 2, t2.micro)
- [ ] Security group allows inbound on ports 22 (SSH), 80, 443, 8090 (WebSocket)
- [ ] Key pair `.pem` file downloaded and saved locally
- [ ] Public IPv4 address noted (e.g., `3.145.123.45`)

### 2. Add GitHub Secrets
Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

#### Secret 1: `EC2_HOST`
- **Value**: Your EC2 public IPv4 (e.g., `3.145.123.45`)
- **Find it**: AWS Console → EC2 → Instances → Public IPv4 column

#### Secret 2: `EC2_USER`
- **Value**: `ec2-user` (for Amazon Linux 2)

#### Secret 3: `EC2_PRIVATE_KEY`
- **Value**: Full contents of your `.pem` file
- **How to get**: 
  ```bash
  cat /path/to/your-key.pem
  ```
  Copy entire output (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### 3. Prepare EC2 Instance
SSH into the instance and run setup:

```bash
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_IP
curl -O https://raw.githubusercontent.com/ssundxr/chat/main/aws/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### 4. Push Code to GitHub
```bash
cd /path/to/onion_chat

# Add all deployment files
git add .
git commit -m "Add AWS EC2 CI/CD deployment"
git push origin main
```

### 5. Monitor First Deployment
- Go to GitHub repo → **Actions** tab
- Click the "Deploy to AWS EC2" workflow
- Watch it build, test, and deploy
- Status will show ✅ or ❌

### 6. Verify It's Running
SSH into EC2 and check:

```bash
sudo systemctl status black-mamba
sudo journalctl -u black-mamba -f
```

Expected output:
```
black mamba relay listening on 0.0.0.0:8090
```

### 7. Test Connectivity
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://YOUR_EC2_IP:8090/
```

You should get a 426 response (expected for non-WebSocket clients).

---

## Troubleshooting

**GitHub Actions fails on deploy step?**
- Check EC2_PRIVATE_KEY secret has full `.pem` content
- Verify EC2_HOST is correct (should be an IP like `3.145.123.45`)
- Ensure EC2 instance is running

**Service won't start on EC2?**
```bash
sudo journalctl -u black-mamba -n 50
```

**Can't SSH to EC2?**
- Security group allows port 22?
- Using correct key file: `-i /path/to/your-key.pem`
- Using correct user: `ec2-user` (not `ubuntu` or `root`)

---

## Next: Update CLI Connection

Users will connect to your public relay:

```bash
export BLACK_MAMBA_WS_URL="ws://YOUR_EC2_IP:8090"
black-mamba
```

Or update [cli/network/ws-client.ts](../../ghost/cli/network/ws-client.ts):
```typescript
const WS_URL = process.env.BLACK_MAMBA_WS_URL ?? "ws://YOUR_EC2_IP:8090";
```

Then rebuild and users get the new endpoint automatically.
