export type CategoryColor =
  | 'blue'
  | 'cyan'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'violet'
  | 'orange'
  | 'slate'

import type { GroupIconId } from '../lib/groupIcons'

export interface CategoryGroup {
  id: string
  name: string
  color: CategoryColor
  icon: GroupIconId
  createdAt: string
}

export type CategoryGroupInput = Pick<CategoryGroup, 'name' | 'color' | 'icon'>
