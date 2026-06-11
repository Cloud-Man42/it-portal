import { getGroupIcon } from '../../lib/groupIcons'

type CategoryIconSize = 'badge' | 'sidebar' | 'card' | 'picker'

interface CategoryIconProps {
  iconId: string | undefined
  size?: CategoryIconSize
  className?: string
}

const sizeClasses: Record<CategoryIconSize, string> = {
  badge: 'h-5 w-5',
  sidebar: 'h-6 w-6',
  card: 'h-18 w-18',
  picker: 'h-12 w-12',
}

export function CategoryIcon({
  iconId,
  size = 'badge',
  className = '',
}: CategoryIconProps) {
  const icon = getGroupIcon(iconId)

  return (
    <img
      src={icon.src}
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-contain ${sizeClasses[size]} ${className}`}
    />
  )
}
