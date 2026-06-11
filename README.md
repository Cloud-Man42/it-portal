# IT Application Portal

A private dashboard for quick access to administrative tools in your IT environment (VMware, network, VPN, firewalls, monitoring, and internal utilities).

Built with React, TypeScript, Tailwind CSS, Express, and SQLite. Application and user data is stored in a shared SQLite database on the server.

## Features

- **Login** with session cookies (httpOnly)
- **User database** editable in the app (admin only)
- **Role-based permissions:**
  - **Fullständig åtkomst** (`admin`) — allt + användarhantering
  - **Redaktör** (`editor`) — lägg till, redigera och ta bort applikationer och grupper
  - **Endast läsning** (`viewer`) — bläddra, sök och öppna länkar
- Dashboard with application cards (name, description, category, URL, icon badge)
- Click a card to open the URL in a new tab
- Add, edit, and delete applications (editor/admin)
- Search by name, description, or URL
- Filter by category/group
- Create, edit, and delete custom groups (editor/admin)
- Dark theme with responsive layout and sidebar navigation
- Seeded with example applications and a default admin account on first start

## Local development

```powershell
git clone <repository-url>
cd it-portal
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

`npm run dev` starts both the API (port 4501) and the Vite frontend (port 5173). The frontend proxies `/api` to the backend.

On first start, change the default admin password immediately via **Användardatabas** in the sidebar.

### Production build (local preview)

```powershell
npm run build
npm run preview
```

## Deploy to Linux server

The portal is served over HTTPS on port **4500** by default. The API listens on port **4501** behind a reverse proxy.

### Deploy from Windows

Requires [PuTTY](https://www.putty.org/) (`plink.exe` and `pscp.exe`).

```powershell
$env:IT_PORTAL_DEPLOY_HOST = 'your-server.example.com'
$env:IT_PORTAL_DEPLOY_USER = 'your-ssh-user'
$env:IT_PORTAL_DEPLOY_PASSWORD = 'your-ssh-password'
$env:IT_PORTAL_REMOTE_DIR = '/opt/it-portal'   # optional
.\deploy\deploy.ps1
```

Required environment variables:

- `IT_PORTAL_DEPLOY_HOST` — target server hostname or IP
- `IT_PORTAL_DEPLOY_USER` — SSH username
- `IT_PORTAL_DEPLOY_PASSWORD` — SSH/sudo password

Optional:

- `IT_PORTAL_REMOTE_DIR` — install path on the server (default: `/opt/it-portal`)

### Manual deploy on server

```bash
export IT_PORTAL_APP_DIR=/opt/it-portal
export IT_PORTAL_SERVER_IP=your.server.ip.or.hostname
cd "$IT_PORTAL_APP_DIR"
bash deploy/install.sh
sudo cp deploy/it-portal.service /etc/systemd/system/
sudo cp deploy/it-portal-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now it-portal-api it-portal
```

Adjust `User=` and paths in the systemd unit files if your install directory or service account differs.

### HTTPS certificate note

The install script generates a self-signed TLS certificate for internal use. Your browser will show a security warning on first visit — accept the certificate for your server to proceed.

## Project structure

```
src/
├── components/     # UI (dashboard, forms, auth, users, layout)
├── hooks/          # React hooks (auth, applications, categories, users)
├── lib/            # API client and permission helpers
└── types/          # TypeScript types
server/             # Express API + SQLite persistence
shared/             # Shared permission definitions
data/               # SQLite database (created at runtime, not in git)
```

## Data storage

User accounts, sessions, applications, and categories are stored in `data/it-portal.db` (SQLite), relative to the application directory.

Each user has their **own dashboard** — applications and groups are scoped to `user_id` in the database. Logging in from another browser or device shows the same personal dashboard. Session cookies are only used for authentication, not for storing dashboard data.

## Tests

```powershell
.\test-windows.ps1
```
