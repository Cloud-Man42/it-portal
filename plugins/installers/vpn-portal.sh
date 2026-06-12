#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="${PLUGIN_DIR:?PLUGIN_DIR is required}"
PLUGIN_REPO="${PLUGIN_REPO:?PLUGIN_REPO is required}"
PLUGIN_BRANCH="${PLUGIN_BRANCH:-main}"
SERVER_HOST="${SERVER_HOST:?SERVER_HOST is required}"
PLUGIN_PORT="${PLUGIN_PORT:?PLUGIN_PORT is required}"
SERVICE_NAME="${SERVICE_NAME:?SERVICE_NAME is required}"
SUDO_PASSWORD="${SUDO_PASSWORD:-}"

run_sudo() {
  if [ -n "$SUDO_PASSWORD" ]; then
    echo "$SUDO_PASSWORD" | sudo -S "$@"
  else
    sudo "$@"
  fi
}

mkdir -p "$(dirname "$PLUGIN_DIR")"

if [ ! -d "$PLUGIN_DIR/.git" ]; then
  git clone --branch "$PLUGIN_BRANCH" --depth 1 "$PLUGIN_REPO" "$PLUGIN_DIR"
fi

cd "$PLUGIN_DIR"

if [ -d frontend ]; then
  if command -v npm >/dev/null 2>&1; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -f "$NVM_DIR/nvm.sh" ]; then
      # shellcheck disable=SC1091
      . "$NVM_DIR/nvm.sh"
      nvm use 22
    fi
    (cd frontend && npm ci && npm run build)
  fi
fi

if [ -f deploy/install.sh ]; then
  export WOL_DEPLOY_PASSWORD="$SUDO_PASSWORD"
  sed -i 's/\r$//' deploy/install.sh
  chmod +x deploy/install.sh
  run_sudo bash deploy/install.sh
  echo "VPN Portal installed via upstream deploy/install.sh"
  exit 0
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=IT Portal Plugin - VPN Portal
After=network.target

[Service]
Type=simple
WorkingDirectory=${PLUGIN_DIR}
EnvironmentFile=${PLUGIN_DIR}/.env
ExecStart=${PLUGIN_DIR}/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PLUGIN_PORT}
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

echo "VPN Portal installed at https://${SERVER_HOST}:${PLUGIN_PORT}"
