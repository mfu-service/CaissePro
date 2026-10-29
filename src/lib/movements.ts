import { all, audit, isDayClosed, lastId, nextDailyCode, one, persist, run, nowStamp } from './db'
import { round2 } from './format'
import type { Movement, MovementRow } from './types'

export type MovementInput = {
  account_id: number
  date: string
  nature: string
  designation?: string
  detail1?: string
  detail2?: string
  remarks?: string
  engagement?: string
  entree?: number
  sortie?: number
  transfer_pair_id?: string
}

function validateAmounts(entree: number, sortie: number) {
  if (entree > 0 && sortie > 0) throw new Error('bothAmounts')
  if (entree < 0 || sortie < 0) throw new Error('bothAmounts')
  if (entree === 0 && sortie === 0) throw new Error('required')
}

export function listMovements(opts: {
  accountId: number
  from?: string
  to?: string
  nature?: string
  q?: string
}): MovementRow[] {
  const params: (string | number)[] = [opts.accountId]
  let sql = `SELECT * FROM movements WHERE account_id = ?`
  if (opts.from) {
    sql += ' AND date >= ?'
    params.push(opts.from)
  }
  if (opts.to) {
    sql += ' AND date <= ?'
    params.push(opts.to)
  }
  if (opts.nature) {
    sql += ' AND nature = ?'
    params.push(opts.nature)
  }
  if (opts.q) {
    sql +=
      ' AND (IFNULL(designation,"") || IFNULL(detail1,"") || IFNULL(detail2,"") || IFNULL(remarks,"") || IFNULL(engagement,"")) LIKE ?'
    params.push(`%${opts.q}%`)
  }
  sql += ' ORDER BY date, daily_code, id'
  const rows = all<Movement>(sql, params)
  let running = 0
  if (opts.from) {
    const before = one<{ n: number }>(
      'SELECT COALESCE(SUM(entree - sortie),0) AS n FROM movements WHERE account_id = ? AND date < ?',
      [opts.accountId, opts.from],
    )
    const opening = one<{ opening_balance: number }>('SELECT opening_balance FROM accounts WHERE id = ?', [
      opts.accountId,
    ])
    running = Number(opening?.opening_balance ?? 0) + Number(before?.n ?? 0)
  } else {
    const opening = one<{ opening_balance: number }>('SELECT opening_balance FROM accounts WHERE id = ?', [
      opts.accountId,
    ])
    running = Number(opening?.opening_balance ?? 0)
  }
  return rows.map((m) => {
    running = round2(running + Number(m.entree) - Number(m.sortie))
    return { ...m, solde: running }
  })
}

export function insertMovement(input: MovementInput, userId: number): number {
  if (isDayClosed(input.account_id, input.date)) throw new Error('dayLocked')
  const entree = round2(Number(input.entree ?? 0))
  const sortie = round2(Number(input.sortie ?? 0))
  validateAmounts(entree, sortie)
  const code = nextDailyCode(input.account_id, input.date)
  run(
    `INSERT INTO movements (account_id, date, daily_code, nature, designation, detail1, detail2, remarks, engagement, entree, sortie, transfer_pair_id, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.account_id,
      input.date,
      code,
      input.nature,
      input.designation ?? null,
      input.detail1 ?? null,
      input.detail2 ?? null,
      input.remarks ?? null,
      input.engagement ?? null,
      entree,
      sortie,
      input.transfer_pair_id ?? null,
      nowStamp(),
      userId,
    ],
  )
  const id = lastId()
  audit(userId, 'create', 'movement', id)
  persist()
  return id
}

export function updateMovement(id: number, input: MovementInput, userId: number, role: string): void {
  const existing = one<Movement>('SELECT * FROM movements WHERE id = ?', [id])
  if (!existing) throw new Error('required')
  if (isDayClosed(existing.account_id, existing.date) && role !== 'admin') throw new Error('dayLocked')
  if (
    (input.account_id !== existing.account_id || input.date !== existing.date) &&
    isDayClosed(input.account_id, input.date) &&
    role !== 'admin'
  ) {
    throw new Error('dayLocked')
  }
  const entree = round2(Number(input.entree ?? 0))
  const sortie = round2(Number(input.sortie ?? 0))
  validateAmounts(entree, sortie)
  const accountChanged = input.account_id !== existing.account_id
  const dateChanged = input.date !== existing.date
  const dailyCode =
    accountChanged || dateChanged ? nextDailyCode(input.account_id, input.date) : existing.daily_code
  run(
    `UPDATE movements SET account_id=?, date=?, daily_code=?, nature=?, designation=?, detail1=?, detail2=?, remarks=?, engagement=?, entree=?, sortie=?, updated_at=?, updated_by=? WHERE id=?`,
    [
      input.account_id,
      input.date,
      dailyCode,
      input.nature,
      input.designation ?? null,
      input.detail1 ?? null,
      input.detail2 ?? null,
      input.remarks ?? null,
      input.engagement ?? null,
      entree,
      sortie,
      nowStamp(),
      userId,
      id,
    ],
  )
  audit(userId, 'update', 'movement', id)
  persist()
}

export function deleteMovement(id: number, userId: number, role: string): void {
  const existing = one<Movement>('SELECT * FROM movements WHERE id = ?', [id])
  if (!existing) return
  if (isDayClosed(existing.account_id, existing.date) && role !== 'admin') throw new Error('dayLocked')
  if (existing.transfer_pair_id) {
    run('DELETE FROM movements WHERE transfer_pair_id = ?', [existing.transfer_pair_id])
  } else {
    run('DELETE FROM attachments WHERE movement_id = ?', [id])
    run('DELETE FROM movements WHERE id = ?', [id])
  }
  audit(userId, 'delete', 'movement', id)
  persist()
}

export function createTransfer(opts: {
  fromId: number
  toId: number
  date: string
  amount: number
  remarks?: string
  userId: number
}): void {
  if (opts.fromId === opts.toId) throw new Error('sameAccount')
  if (isDayClosed(opts.fromId, opts.date) || isDayClosed(opts.toId, opts.date)) throw new Error('dayLocked')
  const amount = round2(opts.amount)
  if (amount <= 0) throw new Error('required')
  const pair = crypto.randomUUID()
  const destAcc = one<{ name_fr: string; code: string }>('SELECT name_fr, code FROM accounts WHERE id = ?', [opts.toId])
  const srcAcc = one<{ name_fr: string; code: string }>('SELECT name_fr, code FROM accounts WHERE id = ?', [opts.fromId])
  insertMovement(
    {
      account_id: opts.fromId,
      date: opts.date,
      nature: 'Transfert',
      designation: destAcc?.code ?? destAcc?.name_fr,
      remarks: opts.remarks,
      sortie: amount,
      transfer_pair_id: pair,
    },
    opts.userId,
  )
  insertMovement(
    {
      account_id: opts.toId,
      date: opts.date,
      nature: 'Transfert',
      designation: srcAcc?.code ?? srcAcc?.name_fr,
      remarks: opts.remarks,
      entree: amount,
      transfer_pair_id: pair,
    },
    opts.userId,
  )
}
