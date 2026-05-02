# black-mamba installer (windows)
# one-liner: iwr https://raw.githubusercontent.com/ssundxr/chat/main/install.ps1 -useb | iex

$Green = "[32m"
$Cyan = "[36m"
$Bold = "[1m"
$Reset = "[0m"

Clear-Host
Write-Host "${Green}┌──────────────────────────────────────────┐"
Write-Host "│  BLACK-MAMBA DIRECT INSTALLER            │"
Write-Host "└──────────────────────────────────────────┘${Reset}"

Write-Host "[ ${Cyan}INFO${Reset} ] Detecting runtime environment..."

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ ${Bold}ERR ${Reset} ] Node.js is not installed. Please install Node.js (https://nodejs.org/)"
    exit
}

$NodeVersion = node -v
Write-Host "[ ${Green} OK ${Reset} ] Node.js $NodeVersion detected."
Write-Host "[ ${Cyan}WAIT${Reset} ] Installing black-mamba core via npm..."

# Install globally
npm install -g onion-chat-mamba --quiet

Write-Host "[ ${Green} OK ${Reset} ] Installation complete."
Write-Host ""
Write-Host "${Bold}You can now run the chat using:${Reset}"
Write-Host "  ${Green}black-mamba${Reset}"
Write-Host ""
Write-Host "${Cyan}Happy hacking.${Reset}"
