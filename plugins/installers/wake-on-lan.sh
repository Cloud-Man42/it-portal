#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="${PLUGIN_DIR:?PLUGIN_DIR is required}"
PLUGIN_REPO="${PLUGIN_REPO:?PLUGIN_REPO is required}"
PLUGIN_BRANCH="${PLUGIN_BRANCH:-main}"
SERVER_HOST="${SERVER_HOST:?SERVER_HOST is required}"
PLUGIN_PORT="${PLUGIN_PORT:?PLUGIN_PORT is required}"
SERVICE_NAME="${SERVICE_NAME:?SERVICE_NAME is required}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -f "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 22
fi

mkdir -p "$(dirname "$PLUGIN_DIR")"

if [ ! -d "$PLUGIN_DIR/.git" ]; then
  git clone --branch "$PLUGIN_BRANCH" --depth 1 "$PLUGIN_REPO" "$PLUGIN_DIR"
fi

cd "$PLUGIN_DIR"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

if [ ! -f certs/cert.pem ] || [ ! -f certs/key.pem ]; then
  node scripts/generate-certs.mjs "$SERVER_HOST" localhost 127.0.0.1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

cat > .env <<EOF
PORT=${PLUGIN_PORT}
HOST=0.0.0.0
CORS_ORIGIN=https://${SERVER_HOST}:${PLUGIN_PORT}
DATA_FILE=./server/data/devices.json
NODE_ENV=production
SSL_CERT_PATH=../certs/cert.pem
SSL_KEY_PATH=../certs/key.pem
EOF

npm run build

UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=IT Portal Plugin - Wake on LAN
After=network.target

[Service]
Type=simple
WorkingDirectory=${PLUGIN_DIR}
EnvironmentFile=${PLUGIN_DIR}/.env
ExecStart=$(command -v npm) run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now "${SERVICE_NAME}.service"

if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$(whoami)" 2>/dev/null || true
fi

echo "Wake on LAN installed at https://${SERVER_HOST}:${PLUGIN_PORT}"
