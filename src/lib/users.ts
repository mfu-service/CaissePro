import { audit, hashPin, lastId, one, persist, run } from './db'
import type { Role, User } from './types'

export type UserErrorCode = 'lastAdmin' | 'selfDemote' | 'duplicateUser' | 'deleteSelf' | 'required'

export class UserError extends Error {
  constructor(public code: UserErrorCode) {
    super(code)
  }
}

export function countActiveAdmins(): number {
  return one<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1")?.c ?? 0
}

function isOnlyActiveAdmin(userId: number): boolean {
  const u = one<User>('SELECT role, active FROM users WHERE id = ?', [userId])
  if (!u || u.role !== 'admin' || !u.active) return false
  return countActiveAdmins() <= 1
}

export function assertCanChangeAdminRole(userId: number, newRole: Role, actorId: number | null): void {
  const u = one<User>('SELECT role, active FROM users WHERE id = ?', [userId])
  if (!u || !u.active || u.role !== 'admin' || newRole === 'admin') return
  if (countActiveAdmins() <= 1) {
    if (actorId === userId) throw new UserError('selfDemote')
    throw new UserError('lastAdmin')
  }
}

export async function createUser(input: {
  username: string
  display_name: string
  pin: string
  role: Role
}): Promise<number> {
  const username = input.username.trim()
  const display_name = input.display_name.trim()
  if (!username || !display_name) throw new UserError('required')
  if (one('SELECT id FROM users WHERE username = ?', [username])) throw new UserError('duplicateUser')
  const h = await hashPin(input.pin.trim() || '1234')
  run('INSERT INTO users (username, display_name, pin_hash, role) VALUES (?,?,?,?)', [
    username,
    display_name,
    h,
    input.role,
  ])
  const id = lastId()
  persist()
  return id
}

export async function updateUser(
  id: number,
  input: { display_name: string; role: Role; pin?: string; active?: boolean },
  actorId: number | null,
): Promise<void> {
  const display_name = input.display_name.trim()
  if (!display_name) throw new UserError('required')

  assertCanChangeAdminRole(id, input.role, actorId)

  if (input.active === false) {
    if (actorId === id) throw new UserError('deleteSelf')
    if (isOnlyActiveAdmin(id)) throw new UserError('lastAdmin')
  }

  let sql = 'UPDATE users SET display_name = ?, role = ?'
  const params: (string | number)[] = [display_name, input.role]

  if (input.pin?.trim()) {
    const h = await hashPin(input.pin.trim())
    sql += ', pin_hash = ?'
    params.push(h)
  }
  if (input.active !== undefined) {
    sql += ', active = ?'
    params.push(input.active ? 1 : 0)
  }
  sql += ' WHERE id = ?'
  params.push(id)

  run(sql, params)
  audit(actorId, 'update', 'user', id, input.role)
  persist()
}

export function deactivateUser(id: number, actorId: number | null): void {
  if (actorId === id) throw new UserError('deleteSelf')
  if (isOnlyActiveAdmin(id)) throw new UserError('lastAdmin')
  run('UPDATE users SET active = 0 WHERE id = ?', [id])
  audit(actorId, 'deactivate', 'user', id)
  persist()
}
