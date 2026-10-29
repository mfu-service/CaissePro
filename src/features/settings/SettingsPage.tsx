import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { accountBalance, all, audit, getSetting, importSqlite, persist, run, setSetting } from '../../lib/db'
import { downloadBackup, exportImportTemplate } from '../../lib/export'
import { expectedBalances, importWorkbook } from '../../lib/importExcel'
import { todayIso } from '../../lib/format'
import { t, type I18nKey } from '../../lib/i18n'
import type { Account, DayClose, ImportReport, Role, User } from '../../lib/types'
import {
  createUser,
  deactivateUser,
  updateUser,
  UserError,
  type UserErrorCode,
} from '../../lib/users'
import {
  Btn,
  Card,
  Field,
  IconBtn,
  Modal,
  PageHeader,
  TableWrap,
  inputClass,
  Money,
} from '../../shared/ui'

const ROLES: Role[] = ['admin', 'cashier', 'accountant']

function userErrorKey(code: UserErrorCode): I18nKey {
  const map: Record<UserErrorCode, I18nKey> = {
    lastAdmin: 'userLastAdmin',
    selfDemote: 'userSelfDemote',
    duplicateUser: 'userDuplicate',
    deleteSelf: 'userDeleteSelf',
    required: 'required',
  }
  return map[code]
}

type EditForm = { display_name: string; role: Role; pin: string; active: boolean }

export function SettingsPage() {
  const { lang, user, refresh, reloadUser, company, tick } = useApp()
  void tick
  const accounts = all<Account>('SELECT * FROM accounts ORDER BY sort_order')
  const users = all<User>('SELECT id, username, display_name, role, active FROM users ORDER BY id')
  const closes = all<DayClose>('SELECT * FROM day_closes ORDER BY date DESC LIMIT 12')
  const auditRows = all<{ at: string; action: string; entity: string; details: string }>(
    'SELECT at, action, entity, details FROM audit_log ORDER BY id DESC LIMIT 15',
  )
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [closeAcc, setCloseAcc] = useState(accounts[0]?.id ?? 1)
  const [closeDate, setCloseDate] = useState(todayIso())
  const [counted, setCounted] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [newUser, setNewUser] = useState({ username: '', display_name: '', pin: '1234', role: 'cashier' as Role })
  const [editing, setEditing] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ display_name: '', role: 'cashier', pin: '', active: true })
  const [userMsg, setUserMsg] = useState<string | null>(null)
  const [editMsg, setEditMsg] = useState<string | null>(null)
  const allowNeg = getSetting('allow_negative', '1') === '1'
  const theoretical = accountBalance(closeAcc, closeDate)

  const doImport = async (buf: ArrayBuffer) => {
    setBusy(true)
    try {
      const r = await importWorkbook(buf)
      const expected = expectedBalances()
      for (const b of r.balances) {
        const exp = expected[b.account as keyof typeof expected]
        if (exp != null) {
          const ok = Math.abs(b.net - exp) < 1
          r.messages.push(
            `${b.account}: net ${b.net.toFixed(2)} ${ok ? '✓' : `(attendu ${exp})`}`,
          )
        }
      }
      setReport(r)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings', lang)} />

      <Card>
        <h2 className="mb-3 text-sm font-bold">{t('importExcel', lang)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              void f.arrayBuffer().then(doImport)
            }}
          />
          <Btn variant="outline" disabled={busy} onClick={() => exportImportTemplate()}>
            {t('sampleImport', lang)}
          </Btn>
          <Link to="/import-help" className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
            {t('importHelpLink', lang)}
          </Link>
        </div>
        {busy && <p className="mt-2 text-sm">…</p>}
        {report && (
          <div className="mt-3 space-y-1 text-sm">
            <p>
              {t('importOk', lang)} — {report.accepted} / skip {report.skipped} / dates {report.flaggedDates}
            </p>
            {report.messages.map((m) => (
              <p key={m}>{m}</p>
            ))}
            {report.unknownNatures.length > 0 && (
              <p>Natures: {report.unknownNatures.join(', ')}</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold">{t('backup', lang)}</h2>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => void downloadBackup()}>{t('downloadBackup', lang)}</Btn>
          {getSetting('last_daily_backup') && (
            <span className="self-center text-xs text-slate-500">
              Auto {getSetting('last_daily_backup')}
            </span>
          )}
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {t('restore', lang)}
            <input
              type="file"
              className="hidden"
              accept=".db,.sqlite"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f || !window.confirm(t('restoreHint', lang))) return
                void f.arrayBuffer().then(async (buf) => {
                  await importSqlite(new Uint8Array(buf))
                  refresh()
                })
              }}
            />
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold">{t('dayClose', lang)}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label={t('account', lang)}>
            <select className={inputClass} value={closeAcc} onChange={(e) => setCloseAcc(Number(e.target.value))}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_fr}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('date', lang)}>
            <input type="date" className={inputClass} value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </Field>
          <Field label={t('theoretical', lang)}>
            <div className="py-2">
              <Money value={theoretical} />
            </div>
          </Field>
          <Field label={t('counted', lang)}>
            <input className={inputClass} type="number" value={counted} onChange={(e) => setCounted(e.target.value)} />
          </Field>
        </div>
        <Field label={t('notes', lang)}>
          <input className={inputClass} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
        </Field>
        <div className="mt-3 flex gap-2">
          <Btn
            onClick={() => {
              const countedN = Number(counted)
              const diff = countedN - theoretical
              run(
                `INSERT INTO day_closes (account_id, date, theoretical, counted, difference, notes, closed_by, closed_at)
                 VALUES (?,?,?,?,?,?,?,?)
                 ON CONFLICT(account_id, date) DO UPDATE SET theoretical=excluded.theoretical, counted=excluded.counted, difference=excluded.difference, notes=excluded.notes`,
                [closeAcc, closeDate, theoretical, countedN, diff, closeNotes || null, user?.id ?? null, new Date().toISOString()],
              )
              if (Math.abs(diff) >= 0.01) {
                run(
                  `INSERT INTO movements (account_id, date, daily_code, nature, remarks, entree, sortie, created_at, created_by)
                   VALUES (?,?,?,?,?,?,?,?,?)`,
                  [
                    closeAcc,
                    closeDate,
                    999,
                    'Décalages',
                    closeNotes || 'Clôture',
                    diff > 0 ? diff : 0,
                    diff < 0 ? -diff : 0,
                    new Date().toISOString(),
                    user?.id ?? null,
                  ],
                )
              }
              audit(user?.id ?? null, 'close', 'day', `${closeAcc}:${closeDate}`)
              persist()
              refresh()
            }}
          >
            {t('closeDay', lang)}
          </Btn>
        </div>
        <ul className="mt-3 text-xs text-slate-500">
          {closes.map((c) => (
            <li key={c.id}>
              {c.date} · écart {c.difference}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold">{t('opening', lang)}</h2>
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className="w-40">{a.name_fr}</span>
              <input
                className={inputClass}
                type="number"
                defaultValue={a.opening_balance}
                onBlur={(e) => {
                  run('UPDATE accounts SET opening_balance = ? WHERE id = ?', [Number(e.target.value), a.id])
                  persist()
                  refresh()
                }}
              />
            </div>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowNeg}
            onChange={(e) => {
              setSetting('allow_negative', e.target.checked ? '1' : '0')
              refresh()
            }}
          />
          {t('allowNegative', lang)}
        </label>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold">{t('users', lang)}</h2>
        {userMsg && (
          <p className="mb-2 text-sm text-amber-800" role="status">
            {userMsg}
          </p>
        )}
        <TableWrap>
          <table className="table-shell mb-3">
            <thead>
              <tr>
                <th>{t('username', lang)}</th>
                <th>{t('name', lang)}</th>
                <th>{t('role', lang)}</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? undefined : 'opacity-60'}>
                  <td className="font-medium text-slate-800">
                    {u.username}
                    {!u.active && (
                      <span className="ms-2 text-xs font-normal text-slate-500">({t('inactive', lang)})</span>
                    )}
                  </td>
                  <td>{u.display_name}</td>
                  <td>{t(u.role, lang)}</td>
                  <td className="text-end">
                    <div className="inline-flex gap-0.5">
                      <IconBtn
                        title={t('edit', lang)}
                        tone="brand"
                        onClick={() => {
                          setUserMsg(null)
                          setEditMsg(null)
                          setEditing(u)
                          setEditForm({
                            display_name: u.display_name,
                            role: u.role,
                            pin: '',
                            active: !!u.active,
                          })
                        }}
                      >
                        <Pencil size={15} />
                      </IconBtn>
                      {!!u.active && (
                        <IconBtn
                          title={t('delete', lang)}
                          tone="danger"
                          onClick={() => {
                            if (!window.confirm(t('confirmDeleteUser', lang))) return
                            try {
                              deactivateUser(u.id, user?.id ?? null)
                              if (user?.id === u.id) reloadUser()
                              setUserMsg(t('saved', lang))
                              refresh()
                            } catch (e) {
                              setUserMsg(
                                e instanceof UserError ? t(userErrorKey(e.code), lang) : t('importError', lang),
                              )
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </IconBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            className={inputClass}
            placeholder={t('username', lang)}
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t('name', lang)}
            value={newUser.display_name}
            onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t('pin', lang)}
            value={newUser.pin}
            onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
          />
          <select
            className={inputClass}
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(r, lang)}
              </option>
            ))}
          </select>
        </div>
        <Btn
          className="mt-2"
          onClick={() => {
            setUserMsg(null)
            void createUser(newUser)
              .then((id) => {
                audit(user?.id ?? null, 'create', 'user', id, newUser.username)
                setNewUser({ username: '', display_name: '', pin: '1234', role: 'cashier' })
                setUserMsg(t('saved', lang))
                refresh()
              })
              .catch((e) => {
                setUserMsg(e instanceof UserError ? t(userErrorKey(e.code), lang) : t('importError', lang))
              })
          }}
        >
          {t('add', lang)}
        </Btn>
      </Card>

      {editing && (
        <Modal
          title={t('editUser', lang)}
          onClose={() => {
            setEditing(null)
            setEditMsg(null)
          }}
          footer={
            <>
              <Btn
                variant="outline"
                onClick={() => {
                  setEditing(null)
                  setEditMsg(null)
                }}
              >
                {t('cancel', lang)}
              </Btn>
              <Btn
                onClick={() => {
                  setUserMsg(null)
                  setEditMsg(null)
                  void updateUser(
                    editing.id,
                    {
                      display_name: editForm.display_name,
                      role: editForm.role,
                      pin: editForm.pin,
                      active: editForm.active,
                    },
                    user?.id ?? null,
                  )
                    .then(() => {
                      if (user?.id === editing.id) reloadUser()
                      setEditing(null)
                      setUserMsg(t('saved', lang))
                      refresh()
                    })
                    .catch((e) => {
                      setEditMsg(
                        e instanceof UserError ? t(userErrorKey(e.code), lang) : t('importError', lang),
                      )
                    })
                }}
              >
                {t('save', lang)}
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            {editMsg && (
              <p className="text-sm text-amber-800" role="alert">
                {editMsg}
              </p>
            )}
            <Field label={t('username', lang)}>
              <input className={inputClass} value={editing.username} readOnly aria-readonly />
            </Field>
            <Field label={t('name', lang)}>
              <input
                className={inputClass}
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </Field>
            <Field label={t('role', lang)}>
              <select
                className={inputClass}
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(r, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('pinOptionalEdit', lang)}>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={editForm.pin}
                onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.active}
                disabled={user?.id === editing.id}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              />
              {t('userActiveAccount', lang)}
            </label>
          </div>
        </Modal>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-bold">{t('audit', lang)}</h2>
        <ul className="text-xs text-slate-500">
          {auditRows.map((a, i) => (
            <li key={i}>
              {a.at.slice(0, 19)} · {a.action} · {a.entity} {a.details || ''}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          {company.name_fr} · {company.fiscal_year}
        </p>
      </Card>
    </div>
  )
}
