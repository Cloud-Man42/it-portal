export interface Application {
  id: string
  name: string
  url: string
  description: string
  category: string
  loginUsername: string
  loginPassword: string
  pluginId: string
  createdAt: string
  shared?: boolean
  canEdit?: boolean
}

export type ApplicationInput = Omit<Application, 'id' | 'createdAt'>
