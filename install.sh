#!/bin/bash

# black-mamba installer (linux/mac)
# one-liner: curl -sSL https://raw.githubusercontent.com/ssundxr/chat/main/install.sh | bash

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
cat << "EOF"
┌──────────────────────────────────────────┐
│  BLACK-MAMBA DIRECT INSTALLER            │
└──────────────────────────────────────────┘
EOF
echo -e "${NC}"

echo -e "[ ${CYAN}INFO${NC} ] Detecting runtime environment..."

if ! command -v node &> /dev/null; then
    echo -e "[ ${BOLD}ERR ${NC} ] Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "[ ${BOLD}ERR ${NC} ] npm is not installed. Please install npm first."
    exit 1
fi

echo -e "[ ${GREEN} OK ${NC} ] Node.js $(node -v) detected."
echo -e "[ ${CYAN}WAIT${NC} ] Installing black-mamba core via npm..."

# Install globally
npm install -g onion-chat-mamba --quiet

echo -e "[ ${GREEN} OK ${NC} ] Installation complete."
echo ""
echo -e "${BOLD}You can now run the chat using:${NC}"
echo -e "  ${GREEN}black-mamba${NC}"
echo ""
echo -e "${CYAN}Happy hacking.${NC}"
