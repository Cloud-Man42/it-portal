#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="${PLUGIN_DIR:?PLUGIN_DIR is required}"
PLUGIN_REPO="${PLUGIN_REPO:?PLUGIN_REPO is required}"
PLUGIN_BRANCH="${PLUGIN_BRANCH:-main}"
SERVER_HOST="${SERVER_HOST:?SERVER_HOST is required}"
PLUGIN_PORT="${PLUGIN_PORT:?PLUGIN_PORT is required}"
SERVICE_NAME="${SERVICE_NAME:?SERVICE_NAME is required}"

mkdir -p "$(dirname "$PLUGIN_DIR")"

if [ ! -d "$PLUGIN_DIR/.git" ]; then
  git clone --branch "$PLUGIN_BRANCH" --depth 1 "$PLUGIN_REPO" "$PLUGIN_DIR"
fi

cd "$PLUGIN_DIR"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

if [ ! -f certs/unifi-ai-optimizer.crt ] || [ ! -f certs/unifi-ai-optimizer.key ]; then
  mkdir -p certs
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout certs/unifi-ai-optimizer.key \
    -out certs/unifi-ai-optimizer.crt \
    -days 825 \
    -subj "/CN=${SERVER_HOST}" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:${SERVER_HOST}"
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

if ! grep -q "^PORT=" .env; then
  echo "PORT=${PLUGIN_PORT}" >> .env
else
  sed -i "s/^PORT=.*/PORT=${PLUGIN_PORT}/" .env
fi

if ! grep -q "^UNIFI_MOCK_MODE=" .env; then
  echo "UNIFI_MOCK_MODE=true" >> .env
fi

cd frontend
npm ci
npm run build
cd ..

UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=IT Portal Plugin - WiFi Optimizer
After=network.target

[Service]
Type=simple
WorkingDirectory=${PLUGIN_DIR}
EnvironmentFile=${PLUGIN_DIR}/.env
ExecStart=${PLUGIN_DIR}/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PLUGIN_PORT} --ssl-keyfile ${PLUGIN_DIR}/certs/unifi-ai-optimizer.key --ssl-certfile ${PLUGIN_DIR}/certs/unifi-ai-optimizer.crt
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

echo "WiFi Optimizer installed at https://${SERVER_HOST}:${PLUGIN_PORT}/ui/"
