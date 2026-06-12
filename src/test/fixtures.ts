import type { Application } from '../types/application'
import type { CategoryGroup } from '../types/category'
import type { ShareableUser } from '../hooks/useShares'

export const sampleCategory: CategoryGroup = {
  id: 'cat-network',
  name: 'Network',
  color: 'cyan',
  icon: 'network',
  createdAt: '2026-01-01T00:00:00.000Z',
}

export const sampleApplication: Application = {
  id: 'app-1',
  name: 'Firewall Admin',
  url: 'https://firewall.local/admin',
  description: 'Firewall policies',
  category: sampleCategory.id,
  loginUsername: 'admin',
  loginPassword: 'secret',
  pluginId: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  shared: false,
  canEdit: true,
}

export const sharedApplication: Application = {
  ...sampleApplication,
  id: 'app-shared',
  name: 'Shared VPN',
  shared: true,
  canEdit: false,
}

export const sampleShareableUser: ShareableUser = {
  id: 'user-viewer',
  username: 'viewer1',
  displayName: 'Viewer One',
  role: 'viewer',
  applicationIds: ['app-1'],
}
