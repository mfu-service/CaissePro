import type { Role, User } from './types'

export function can(user: User | null, action: string): boolean {
  if (!user) return false
  const r: Role = user.role
  if (r === 'admin') return true
  const map: Record<string, Role[]> = {
    journal: ['cashier', 'accountant'],
    transfer: ['cashier', 'accountant'],
    dashboard: ['cashier', 'accountant'],
    reports: ['accountant'],
    parties: ['accountant'],
    receivables: ['accountant'],
    transport: ['cashier', 'accountant'],
    dayClose: ['cashier', 'accountant'],
    reopen: [],
    company: [],
    settings: [],
    users: [],
    import: [],
    deleteClosed: [],
  }
  return (map[action] ?? []).includes(r)
}
