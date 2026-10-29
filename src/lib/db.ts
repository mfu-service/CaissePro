import type { Database, SqlValue } from 'sql.js'
import {
  CATEGORY_TREE,
  DEFAULT_COMPANY,
  SCHEMA_SQL,
  SEED_ACCOUNTS,
  SEED_PARTIES,
  SEED_VEHICLES,
} from './schema'
import { todayIso } from './format'
import type { CompanyProfile } from './types'

const IDB_NAME = 'caissepro'
const IDB_STORE = 'kv'
const DB_KEY = 'sqlite'
const LOGO_KEY = 'logo'

let sqlDb: Database | null = null
let persistTimer: number | null = null

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<Uint8Array | string | undefined> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: Uint8Array | string): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`caissepro:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function insertCategoryTree(
  db: Database,
  nodes: typeof CATEGORY_TREE,
  parentId: number | null,
  level: number,
) {
  for (const node of nodes) {
    db.run('INSERT INTO categories (parent_id, level, name, name_ar) VALUES (?, ?, ?, ?)', [
      parentId,
      level,
      node.name,
      node.name_ar ?? null,
    ])
    const id = db.exec('SELECT last_insert_rowid() AS id')[0]!.values[0]![0] as number
    if (node.children?.length) insertCategoryTree(db, node.children, id, level + 1)
  }
}

async function seed(db: Database) {
  const adminHash = await hashPin('1234')
  db.run(
    'INSERT INTO users (username, display_name, pin_hash, role) VALUES (?, ?, ?, ?)',
    ['admin', 'Administrateur', adminHash, 'admin'],
  )
  db.run(
    'INSERT INTO users (username, display_name, pin_hash, role) VALUES (?, ?, ?, ?)',
    ['caisse', 'Caissier', adminHash, 'cashier'],
  )
  db.run(
    'INSERT INTO users (username, display_name, pin_hash, role) VALUES (?, ?, ?, ?)',
    ['compta', 'Comptable', adminHash, 'accountant'],
  )

  for (const a of SEED_ACCOUNTS) {
    db.run(
      'INSERT INTO accounts (code, name_fr, name_ar, kind, sort_order) VALUES (?, ?, ?, ?, ?)',
      [a.code, a.name_fr, a.name_ar, a.kind, a.sort_order],
    )
  }
  insertCategoryTree(db, CATEGORY_TREE, null, 1)
  for (const p of SEED_PARTIES) {
    db.run('INSERT INTO parties (kind, name) VALUES (?, ?)', [p.kind, p.name])
  }
  for (const v of SEED_VEHICLES) {
    db.run('INSERT INTO vehicles (name) VALUES (?)', [v])
  }
  for (const [k, v] of Object.entries(DEFAULT_COMPANY)) {
    db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, v])
  }
}

type SqlEngine = { Database: new (data?: ArrayLike<number> | null) => Database }

function publicAsset(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${file}`.replace(/([^:]\/)\/+/g, '$1')
}

async function loadSql(): Promise<SqlEngine> {
  const w = window as unknown as {
    initSqlJs?: (cfg: { locateFile: (f: string) => string }) => Promise<SqlEngine>
  }
  if (!w.initSqlJs) {
    const code = await fetch(publicAsset('sql-wasm.js')).then((r) => {
      if (!r.ok) throw new Error('sql.js script failed')
      return r.text()
    })
    // sql.js does `module = undefined` so Emscripten does not overwrite exports.
    // That assignment throws "module is not defined" in strict / ESM contexts.
    const patched = code.replace(/\bmodule = undefined;/, 'var module = undefined;')
    const factory = new Function(
      `${patched}\nreturn typeof initSqlJs === 'function' ? initSqlJs : undefined;`,
    )
    w.initSqlJs = factory() as typeof w.initSqlJs
  }
  if (!w.initSqlJs) throw new Error('sql.js failed to load')
  return w.initSqlJs({
    locateFile: (file) => publicAsset(file.endsWith('.wasm') ? 'sql-wasm.wasm' : file),
  })
}

export async function initDb(): Promise<Database> {
  if (sqlDb) return sqlDb
  const [SQL, saved] = await Promise.all([loadSql(), idbGet(DB_KEY)])
  if (saved instanceof Uint8Array && saved.length > 0) {
    sqlDb = new SQL.Database(saved)
  } else {
    sqlDb = new SQL.Database()
    sqlDb.run(SCHEMA_SQL)
    await seed(sqlDb)
    await persistNow()
  }
  return sqlDb
}

export function getDb(): Database {
  if (!sqlDb) throw new Error('Database not initialized')
  return sqlDb
}

export function all<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

export function one<T>(sql: string, params: SqlValue[] = []): T | undefined {
  return all<T>(sql, params)[0]
}

export function run(sql: string, params: SqlValue[] = []): void {
  getDb().run(sql, params)
}

export function lastId(): number {
  return one<{ id: number }>('SELECT last_insert_rowid() AS id')!.id
}

async function ensureDailyBackup(bytes: Uint8Array): Promise<void> {
  if (!sqlDb) return
  const today = todayIso()
  const last = one<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['last_daily_backup'])?.value
  if (last === today) return
  await idbSet(`backup-${today}`, bytes)
  sqlDb.run(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ['last_daily_backup', today],
  )
  await idbSet(DB_KEY, sqlDb.export())
}

export async function persistNow(): Promise<void> {
  if (!sqlDb) return
  const bytes = sqlDb.export()
  await idbSet(DB_KEY, bytes)
  await ensureDailyBackup(bytes)
}

export async function loadDailyBackup(date: string): Promise<Uint8Array | undefined> {
  const stored = await idbGet(`backup-${date}`)
  return stored instanceof Uint8Array ? stored : undefined
}

export function persist(): void {
  if (persistTimer) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    void persistNow()
  }, 250)
}

export async function exportSqlite(): Promise<Uint8Array> {
  return getDb().export()
}

export async function importSqlite(bytes: Uint8Array): Promise<void> {
  const SQL = await loadSql()
  sqlDb?.close()
  sqlDb = new SQL.Database(bytes)
  sqlDb.run(SCHEMA_SQL)
  await persistNow()
}

export async function resetDatabase(): Promise<void> {
  const SQL = await loadSql()
  sqlDb?.close()
  sqlDb = new SQL.Database()
  sqlDb.run(SCHEMA_SQL)
  await seed(sqlDb)
  await persistNow()
}

export function getSetting(key: string, fallback = ''): string {
  return one<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])?.value ?? fallback
}

export function setSetting(key: string, value: string): void {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ])
  persist()
}

export function getCompany(): CompanyProfile {
  const keys: (keyof CompanyProfile)[] = [
    'name_ar',
    'name_fr',
    'legal_form',
    'address',
    'city',
    'phone',
    'email',
    'website',
    'rc',
    'nif',
    'nis',
    'ai',
    'fiscal_year',
    'fiscal_start',
    'logo_data_url',
    'backup_path',
    'setup_done',
  ]
  const profile = { ...DEFAULT_COMPANY } as CompanyProfile
  for (const k of keys) {
    profile[k] = getSetting(k, DEFAULT_COMPANY[k] ?? '')
  }
  return profile
}

export function saveCompany(profile: Partial<CompanyProfile>, userId?: number): void {
  for (const [k, v] of Object.entries(profile)) {
    if (v == null) continue
    setSetting(k, String(v))
  }
  audit(userId ?? null, 'update', 'company', '1', JSON.stringify(Object.keys(profile)))
  persist()
}

export async function saveLogo(dataUrl: string): Promise<void> {
  await idbSet(LOGO_KEY, dataUrl)
  setSetting('logo_data_url', dataUrl)
}

export async function loadLogo(): Promise<string> {
  const fromSettings = getSetting('logo_data_url')
  if (fromSettings) return fromSettings
  const stored = await idbGet(LOGO_KEY)
  return typeof stored === 'string' ? stored : ''
}

export function audit(
  userId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  details?: string,
): void {
  run('INSERT INTO audit_log (at, user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)', [
    new Date().toISOString(),
    userId,
    action,
    entity,
    entityId == null ? null : String(entityId),
    details ?? null,
  ])
}

export function isDayClosed(accountId: number, date: string): boolean {
  return Boolean(one('SELECT id FROM day_closes WHERE account_id = ? AND date = ?', [accountId, date]))
}

export function nextDailyCode(accountId: number, date: string): number {
  const row = one<{ n: number }>(
    'SELECT COALESCE(MAX(daily_code), 0) + 1 AS n FROM movements WHERE account_id = ? AND date = ?',
    [accountId, date],
  )
  return row?.n ?? 1
}

export function accountBalance(accountId: number, untilDate?: string, untilId?: number): number {
  const acc = one<{ opening_balance: number }>('SELECT opening_balance FROM accounts WHERE id = ?', [accountId])
  const opening = acc?.opening_balance ?? 0
  let sql =
    'SELECT COALESCE(SUM(entree),0) AS e, COALESCE(SUM(sortie),0) AS s FROM movements WHERE account_id = ?'
  const params: SqlValue[] = [accountId]
  if (untilDate) {
    sql += ' AND date <= ?'
    params.push(untilDate)
  }
  if (untilId != null) {
    sql += ' AND id <= ?'
    params.push(untilId)
  }
  const row = one<{ e: number; s: number }>(sql, params)
  return opening + Number(row?.e ?? 0) - Number(row?.s ?? 0)
}

export function nowStamp(): string {
  return new Date().toISOString()
}

export { todayIso }
