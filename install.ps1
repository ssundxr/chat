# black-mamba installer (windows)
# one-liner: iwr https://raw.githubusercontent.com/ssundxr/chat/main/install.ps1 -useb | iex

# Enable ANSI colors for old Windows consoles
if ($PSVersionTable.PSVersion.Major -ge 5) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
}

$E = [char]27
$Green = "$E[32m"
$Cyan = "$E[36m"
$Bold = "$E[1m"
$Reset = "$E[0m"

Clear-Host
Write-Host "${Green}┌──────────────────────────────────────────┐"
Write-Host "│  BLACK-MAMBA DIRECT INSTALLER            │"
Write-Host "└──────────────────────────────────────────┘${Reset}"

Write-Host "[ ${Cyan}INFO${Reset} ] Detecting runtime environment..."

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ ${Bold}ERR ${Reset} ] Node.js is not installed. Please install Node.js (https://nodejs.org/)"
    return
}

$NodeVersion = node -v
Write-Host "[ ${Green} OK ${Reset} ] Node.js $NodeVersion detected."
Write-Host "[ ${Cyan}WAIT${Reset} ] Installing black-mamba core via npm..."

# Use npm.cmd to bypass PowerShell execution policy issues
& npm.cmd install -g onion-chat-mamba --quiet

Write-Host "[ ${Green} OK ${Reset} ] Installation complete."
Write-Host ""
Write-Host "${Bold}You can now run the chat using:${Reset}"
Write-Host "  ${Green}black-mamba${Reset}"
Write-Host ""
Write-Host "NOTE: If 'black-mamba' is not recognized, please restart your terminal."
Write-Host ""
Write-Host "${Cyan}Happy hacking.${Reset}"
