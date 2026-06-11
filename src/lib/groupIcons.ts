export const GROUP_ICONS = [
  { id: 'backup', label: 'Backup', src: '/ico/backup.png' },
  { id: 'firewall', label: 'Firewall', src: '/ico/firewall.png' },
  { id: 'ipmi', label: 'IPMI', src: '/ico/ipmi.png' },
  { id: 'linux', label: 'Linux', src: '/ico/linux.png' },
  { id: 'monitoring', label: 'Monitoring', src: '/ico/monitoring.png' },
  { id: 'nas', label: 'NAS', src: '/ico/nas.png' },
  { id: 'network', label: 'Network', src: '/ico/network.png' },
  { id: 'other', label: 'Other', src: '/ico/other.png' },
  { id: 'printer', label: 'Printer', src: '/ico/printer.png' },
  { id: 'proxmox', label: 'Proxmox', src: '/ico/proxmox.png' },
  { id: 'san', label: 'SAN', src: '/ico/san.png' },
  { id: 'storage', label: 'Storage', src: '/ico/storage.png' },
  { id: 'video', label: 'Video', src: '/ico/video.png' },
  { id: 'virtual_env', label: 'Virtual env', src: '/ico/virtual_env.png' },
  { id: 'vmware', label: 'VMware', src: '/ico/vmware.png' },
  { id: 'vpn', label: 'VPN', src: '/ico/vpn.png' },
  { id: 'windows', label: 'Windows', src: '/ico/windows.png' },
] as const

export type GroupIconId = (typeof GROUP_ICONS)[number]['id']

export const DEFAULT_ICON: GroupIconId = 'other'

const DEFAULT_GROUP_ICONS: Record<string, GroupIconId> = {
  vmware: 'vmware',
  network: 'network',
  vpn: 'vpn',
  security: 'firewall',
  monitoring: 'monitoring',
  other: 'other',
}

const iconById = new Map(GROUP_ICONS.map((icon) => [icon.id, icon]))

export function isGroupIconId(value: string): value is GroupIconId {
  return iconById.has(value as GroupIconId)
}

export function getGroupIcon(iconId: string | undefined) {
  if (iconId && isGroupIconId(iconId)) {
    return iconById.get(iconId)!
  }
  return iconById.get(DEFAULT_ICON)!
}

export function resolveCategoryIconId(
  category: { id: string; icon?: string } | undefined,
): GroupIconId {
  if (!category) return DEFAULT_ICON

  if (category.icon && isGroupIconId(category.icon)) {
    return category.icon
  }

  return DEFAULT_GROUP_ICONS[category.id] ?? DEFAULT_ICON
}
