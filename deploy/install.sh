#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${IT_PORTAL_APP_DIR:-/opt/it-portal}"
SERVER_IP="${IT_PORTAL_SERVER_IP:?Set IT_PORTAL_SERVER_IP to your server IP or hostname}"
CERT_DIR="$APP_DIR/certs"
CADDY_BIN="$APP_DIR/bin/caddy"
export NVM_DIR="$HOME/.nvm"

if [ -f "$NVM_DIR/nvm.sh" ]; then
	# shellcheck disable=SC1091
	. "$NVM_DIR/nvm.sh"
	nvm use 22
fi

cd "$APP_DIR"

echo "==> Installing dependencies and building"
npm install
npm rebuild better-sqlite3
npm run build

echo "==> Preparing API data directory"
mkdir -p "$APP_DIR/data"

echo "==> Creating TLS certificates"
mkdir -p "$CERT_DIR"
if [ ! -f "$CERT_DIR/it-portal.pem" ]; then
	openssl req -x509 -newkey rsa:2048 -nodes \
		-keyout "$CERT_DIR/it-portal-key.pem" \
		-out "$CERT_DIR/it-portal.pem" \
		-days 825 \
		-subj "/CN=${SERVER_IP}" \
		-addext "subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:${SERVER_IP}"
fi

echo "==> Ensuring local Caddy binary"
mkdir -p "$APP_DIR/bin"
if [ ! -x "$CADDY_BIN" ]; then
	curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=amd64" -o "$CADDY_BIN"
	chmod +x "$CADDY_BIN"
fi

echo "IT Portal build complete."
