# Black Mamba - AWS EC2 Deployment Guide

## Overview
This guide sets up automatic deployment of the Black Mamba relay server to AWS EC2 via GitHub Actions CI/CD.

## Prerequisites
- AWS account with free tier credits
- GitHub account
- EC2 key pair created in AWS

## Step 1: Launch EC2 Instance

1. Go to [AWS Console](https://console.aws.amazon.com/ec2)
2. Click **Launch Instances**
3. **Name**: `black-mamba-relay`
4. **AMI**: Amazon Linux 2 (free tier eligible)
5. **Instance Type**: `t2.micro` (free tier)
6. **Key Pair**: Create or select your key pair
7. **Security Group**: Create new, add inbound rules:
   - HTTP (80) — anywhere
   - HTTPS (443) — anywhere
   - Custom TCP 8090 — anywhere (for WebSocket relay)
   - SSH (22) — your IP only
8. **Storage**: 20GB gp2 (default)
9. Click **Launch**

## Step 2: Configure GitHub Secrets

These secrets enable GitHub Actions to deploy to your EC2 instance.

1. Go to your GitHub repo: https://github.com/ssundxr/chat
2. Settings → Secrets and variables → Actions
3. Add these secrets:

### `EC2_HOST`
- Your EC2 public IP (e.g., `3.145.123.45`)
- Find it in AWS Console → EC2 Instances → Public IPv4

### `EC2_USER`
- Value: `ec2-user` (for Amazon Linux 2)

### `EC2_PRIVATE_KEY`
- The entire contents of your `.pem` private key file
- **Important**: Keep this secret, never commit it!
- Get it from AWS when you created the key pair

## Step 3: Prepare EC2 Instance

SSH into your EC2 instance and run the setup script:

```bash
# SSH in (use your public IP and key)
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_IP

# Download and run setup script
curl -O https://raw.githubusercontent.com/ssundxr/chat/main/aws/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

Or manually:

```bash
# Update packages
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Create app directory
mkdir -p ~/black-mamba-server
cd ~/black-mamba-server

# Copy systemd service file (manually or via scp)
sudo cp black-mamba.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable black-mamba
```

## Step 4: Deploy

Push code to GitHub `main` branch:

```bash
cd /path/to/onion_chat

git add .
git commit -m "Deploy black mamba relay server"
git push origin main
```

GitHub Actions will automatically:
1. Build the project
2. Upload to EC2
3. Install production dependencies
4. Restart the service

**Monitor deployment**: Go to GitHub repo → Actions tab

## Step 5: Verify Deployment

Check service status on EC2:

```bash
# SSH to EC2
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_IP

# Check service status
sudo systemctl status black-mamba

# View logs
sudo journalctl -u black-mamba -f

# Test connectivity (from your local machine)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://YOUR_EC2_IP:8090/
```

## Step 6: Configure CLI Client

When users run the CLI, they'll connect to:

```
ws://YOUR_EC2_IP:8090
```

To set this globally, users can export:

```bash
export BLACK_MAMBA_WS_URL="ws://YOUR_EC2_IP:8090"
black-mamba
```

Or it's hardcoded in [cli/network/ws-client.ts](../../ghost/cli/network/ws-client.ts)

## Environment Variables (on EC2)

Edit `/etc/systemd/system/black-mamba.service` to change:

```
BLACK_MAMBA_HOST=0.0.0.0          # Listen on all interfaces
BLACK_MAMBA_PORT=8090             # WebSocket port
BLACK_MAMBA_TTL_MS=600000         # Room TTL (10 min)
BLACK_MAMBA_MAX_ROOMS=500         # Max rooms
BLACK_MAMBA_MAX_ROOM_SIZE=10      # Max peers per room
BLACK_MAMBA_MAX_PAYLOAD_BYTES=65536
BLACK_MAMBA_MAX_MESSAGES_PER_SECOND=10
```

Then reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart black-mamba
```

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u black-mamba -n 50
```

### Port 8090 already in use
```bash
sudo lsof -i :8090
```

### Permission denied on deploy
- Check GitHub secret `EC2_PRIVATE_KEY` is correct
- Ensure EC2 security group allows SSH (port 22)

### GitHub Actions fails
- Check repo Actions logs
- Verify secrets are set correctly
- Ensure EC2 is running

## Cleanup / Costs

After free trial ends:
- Stop instance: saves ~$1/day when not running
- Delete instance: removes all charges
- Elastic IP: keep unassigned (~$3/month if not attached)

## Security Notes

- Server validates all message envelopes
- No plaintext on server (all encrypted end-to-end)
- Firewall rules: only expose 8090 and SSH
- Rotate EC2 key regularly
- Monitor GitHub Actions logs for unauthorized deployments
