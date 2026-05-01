#!/bin/bash
set -e

echo "========================================="
echo "Black Mamba Server - EC2 Setup"
echo "========================================="

# Update system
echo "[1/6] Updating system packages..."
sudo yum update -y

# Install Node.js 20
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Create application directory
echo "[3/6] Creating application directory..."
mkdir -p ~/black-mamba-server
cd ~/black-mamba-server

# Clone or copy code (this is a placeholder; you'll deploy via GitHub Actions)
echo "[4/6] Setting up systemd service..."
sudo cp /tmp/black-mamba.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable black-mamba

# Create .env file for environment variables
echo "[5/6] Creating environment configuration..."
cat > ~/.black-mamba-env << EOF
NODE_ENV=production
BLACK_MAMBA_HOST=0.0.0.0
BLACK_MAMBA_PORT=8090
BLACK_MAMBA_TTL_MS=600000
BLACK_MAMBA_MAX_ROOMS=500
BLACK_MAMBA_MAX_ROOM_SIZE=10
BLACK_MAMBA_MAX_PAYLOAD_BYTES=65536
BLACK_MAMBA_MAX_MESSAGES_PER_SECOND=10
EOF

echo "[6/6] Setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure GitHub Actions secrets are configured (EC2_HOST, EC2_USER, EC2_PRIVATE_KEY)"
echo "2. Push code to GitHub main branch"
echo "3. GitHub Actions will auto-deploy the server"
echo "4. Verify with: sudo systemctl status black-mamba"
echo "5. Logs: sudo journalctl -u black-mamba -f"
echo ""
echo "Server will listen on: ws://$(ec2-metadata --public-ipv4 | cut -d' ' -f2):8090"
