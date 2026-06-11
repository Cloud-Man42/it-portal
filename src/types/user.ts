export type { Role } from '../../shared/permissions'
export { ROLE_LABELS } from '../../shared/permissions'

export interface User {
  id: string
  username: string
  displayName: string
  role: import('../../shared/permissions').Role
  createdAt: string
}

export interface UserInput {
  username: string
  displayName: string
  password: string
  role: import('../../shared/permissions').Role
}

export interface UserUpdateInput {
  username: string
  displayName: string
  password: string
  role: import('../../shared/permissions').Role
}
