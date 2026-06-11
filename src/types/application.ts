export interface Application {
  id: string
  name: string
  url: string
  description: string
  category: string
  createdAt: string
}

export type ApplicationInput = Omit<Application, 'id' | 'createdAt'>
