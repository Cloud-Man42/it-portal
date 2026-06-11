# Deploy IT Portal to Linux server.
# Usage:
#   $env:IT_PORTAL_DEPLOY_HOST = 'your-server'
#   $env:IT_PORTAL_DEPLOY_USER = 'your-user'
#   $env:IT_PORTAL_DEPLOY_PASSWORD = 'your-password'
#   .\deploy\deploy.ps1

param(
  [string]$ServerHost = $env:IT_PORTAL_DEPLOY_HOST,
  [string]$User = $env:IT_PORTAL_DEPLOY_USER,
  [string]$Password = $env:IT_PORTAL_DEPLOY_PASSWORD,
  [string]$RemoteAppDir = $(if ($env:IT_PORTAL_REMOTE_DIR) { $env:IT_PORTAL_REMOTE_DIR } else { "/opt/it-portal" })
)

$ErrorActionPreference = "Stop"
$Plink = "C:\Program Files\PuTTY\plink.exe"
$Pscp = "C:\Program Files\PuTTY\pscp.exe"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Archive = Join-Path $env:TEMP "it-portal-deploy.tar.gz"

if (-not $ServerHost) {
  Write-Error "Set IT_PORTAL_DEPLOY_HOST environment variable."
}
if (-not $User) {
  Write-Error "Set IT_PORTAL_DEPLOY_USER environment variable."
}
if (-not $Password) {
  Write-Error "Set IT_PORTAL_DEPLOY_PASSWORD environment variable."
}

function Invoke-Remote([string]$Command) {
  & $Plink -batch -pw $Password "${User}@${ServerHost}" $Command
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $Command" }
}

function Send-File([string]$Local, [string]$Remote) {
  & $Pscp -batch -pw $Password $Local "${User}@${ServerHost}:${Remote}"
  if ($LASTEXITCODE -ne 0) { throw "Upload failed: $Local" }
}

Write-Host "==> Checking server ports"
Invoke-Remote "ss -tlnp | grep -E ':4500|:4501' || true"

Write-Host "==> Preparing archive from $Root"
Push-Location $Root
try {
  if (Test-Path $Archive) { Remove-Item $Archive -Force }
  & tar -czf $Archive `
    --exclude=node_modules `
    --exclude=dist `
    --exclude=.git `
    --exclude=certs `
    --exclude=data `
    .
  if ($LASTEXITCODE -ne 0) { throw "tar failed" }
}
finally {
  Pop-Location
}

Write-Host "==> Uploading application"
Invoke-Remote "mkdir -p $RemoteAppDir"
Send-File $Archive "$RemoteAppDir/it-portal-deploy.tar.gz"
Invoke-Remote "cd $RemoteAppDir && tar -xzf it-portal-deploy.tar.gz && rm it-portal-deploy.tar.gz"

Write-Host "==> Building on server"
Send-File (Join-Path $Root "deploy\install.sh") "$RemoteAppDir/deploy/install.sh"
Invoke-Remote "sed -i 's/\r$//' $RemoteAppDir/deploy/install.sh && chmod +x $RemoteAppDir/deploy/install.sh && IT_PORTAL_APP_DIR='$RemoteAppDir' IT_PORTAL_SERVER_IP='$ServerHost' bash $RemoteAppDir/deploy/install.sh"

Invoke-Remote "echo $Password | sudo -S ufw allow 4500/tcp 2>/dev/null || true"

Write-Host "==> Installing systemd services"
Send-File (Join-Path $Root "deploy\it-portal.service") "/tmp/it-portal.service"
Send-File (Join-Path $Root "deploy\it-portal-api.service") "/tmp/it-portal-api.service"
Invoke-Remote "echo $Password | sudo -S sed -i 's|/opt/it-portal|$RemoteAppDir|g' /tmp/it-portal.service /tmp/it-portal-api.service && echo $Password | sudo -S sed -i 's/^User=.*/User=$User/' /tmp/it-portal.service /tmp/it-portal-api.service && echo $Password | sudo -S mv /tmp/it-portal.service /etc/systemd/system/it-portal.service && echo $Password | sudo -S mv /tmp/it-portal-api.service /etc/systemd/system/it-portal-api.service && echo $Password | sudo -S systemctl daemon-reload && echo $Password | sudo -S systemctl enable it-portal it-portal-api && echo $Password | sudo -S systemctl restart it-portal-api it-portal && echo $Password | sudo -S systemctl is-active it-portal-api && echo $Password | sudo -S systemctl is-active it-portal"

Write-Host ""
Write-Host "Deploy complete: https://${ServerHost}:4500"
