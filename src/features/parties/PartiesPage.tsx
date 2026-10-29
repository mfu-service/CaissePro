import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { childrenOf } from '../../lib/cascade'
import { addCategory, deleteCategory, renameCategory } from '../../lib/categories'
import { all, persist, run, lastId, audit } from '../../lib/db'
import { t, type I18nKey } from '../../lib/i18n'
import type { Category, Party, Vehicle } from '../../lib/types'
import {
  Btn,
  Card,
  CardHeader,
  EmptyRow,
  IconBtn,
  PageHeader,
  SegmentedTabs,
  TableWrap,
  inputClass,
} from '../../shared/ui'

const TABS: { id: string; key: I18nKey }[] = [
  { id: 'collaborateur', key: 'collaborators' },
  { id: 'associe', key: 'associes' },
  { id: 'fournisseur', key: 'fournisseurs' },
  { id: 'transporteur', key: 'transporteurs' },
  { id: 'client', key: 'clients' },
  { id: 'vehicles', key: 'vehicles' },
  { id: 'natures', key: 'categoryTree' },
]

const PARTY_TABS = new Set(['collaborateur', 'associe', 'fournisseur', 'transporteur', 'client'])

export function PartiesPage() {
  const { lang, user, refresh, tick } = useApp()
  const [tab, setTab] = useState('collaborateur')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const isPartyTab = PARTY_TABS.has(tab)
  const parties = isPartyTab ? all<Party>('SELECT * FROM parties WHERE kind = ? ORDER BY name', [tab]) : []
  const vehicles = tab === 'vehicles' ? all<Vehicle>('SELECT * FROM vehicles ORDER BY name') : []
  const cats = tab === 'natures' ? all<Category>('SELECT * FROM categories WHERE level = 1 ORDER BY id') : []
  void tick

  const tabItems = useMemo(() => TABS.map((k) => ({ id: k.id, label: t(k.key, lang) })), [lang])

  const addParty = () => {
    if (!name.trim() || !isPartyTab) return
    run('INSERT INTO parties (kind, name, phone) VALUES (?,?,?)', [tab, name.trim(), phone || null])
    audit(user?.id ?? null, 'create', 'party', lastId())
    persist()
    setName('')
    setPhone('')
    refresh()
  }

  return (
    <div className="space-y-2">
      <PageHeader title={t('parties', lang)} />

      <SegmentedTabs
        items={tabItems}
        value={tab}
        onChange={(id) => {
          setTab(id)
          setName('')
          setPhone('')
        }}
      />

      {isPartyTab && (
        <Card>
          <CardHeader title={t(TABS.find((x) => x.id === tab)!.key, lang)} />
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className={inputClass} placeholder={t('name', lang)} value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputClass} placeholder={t('phone', lang)} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Btn onClick={addParty}>{t('add', lang)}</Btn>
          </div>
          <TableWrap>
            <table className="table-shell">
              <thead>
                <tr>
                  <th>{t('name', lang)}</th>
                  <th>{t('phone', lang)}</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-slate-800">{p.name}</td>
                    <td className="text-slate-600">{p.phone || '—'}</td>
                    <td className="text-end">
                      <IconBtn
                        title={t('delete', lang)}
                        tone="danger"
                        onClick={() => {
                          run('DELETE FROM parties WHERE id = ?', [p.id])
                          persist()
                          refresh()
                        }}
                      >
                        <Trash2 size={15} />
                      </IconBtn>
                    </td>
                  </tr>
                ))}
                {!parties.length && <EmptyRow colSpan={3} message={t('noData', lang)} />}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {tab === 'vehicles' && (
        <Card>
          <CardHeader title={t('vehicles', lang)} />
          <VehicleForm />
          <TableWrap>
            <table className="table-shell">
              <thead>
                <tr>
                  <th>{t('name', lang)}</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="font-medium">{v.name}</td>
                    <td className="text-end">
                      <IconBtn
                        title={t('delete', lang)}
                        tone="danger"
                        onClick={() => {
                          run('DELETE FROM vehicles WHERE id = ?', [v.id])
                          persist()
                          refresh()
                        }}
                      >
                        <Trash2 size={15} />
                      </IconBtn>
                    </td>
                  </tr>
                ))}
                {!vehicles.length && <EmptyRow colSpan={2} message={t('noData', lang)} />}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {tab === 'natures' && (
        <Card>
          <CardHeader title={t('categoryTree', lang)} />
          <CategoryTree cats={cats} />
        </Card>
      )}
    </div>
  )
}

function CategoryTree({ cats }: { cats: Category[] }) {
  const { lang, refresh, user } = useApp()
  const [natId, setNatId] = useState<number | null>(cats[0]?.id ?? null)
  const [desId, setDesId] = useState<number | null>(null)
  const [draft, setDraft] = useState({ n: '', d: '', t: '' })
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null)
  const designations = natId ? childrenOf(natId) : []
  const details = desId ? childrenOf(desId) : []
  const nat = cats.find((c) => c.id === natId)

  const add = (name: string, parentId: number | null, level: number) => {
    if (!name.trim()) return
    addCategory(name, parentId, level)
    audit(user?.id ?? null, 'create', 'category', lastId(), name)
    refresh()
  }

  const saveRename = () => {
    if (!renaming) return
    renameCategory(renaming.id, renaming.name)
    audit(user?.id ?? null, 'update', 'category', renaming.id, renaming.name)
    setRenaming(null)
    refresh()
  }

  const remove = (id: number) => {
    if (!window.confirm(t('confirmDeleteCat', lang))) return
    deleteCategory(id)
    if (natId === id) setNatId(null)
    if (desId === id) setDesId(null)
    refresh()
  }

  const Row = ({
    item,
    selected,
    onSelect,
  }: {
    item: Category
    selected: boolean
    onSelect: () => void
  }) => (
    <li
      className={`flex items-center gap-1 rounded-lg px-1.5 py-1 transition ${selected ? 'bg-teal-50 ring-1 ring-teal-100' : 'hover:bg-slate-50'}`}
    >
      {renaming?.id === item.id ? (
        <input
          className={`${inputClass} py-1`}
          value={renaming.name}
          autoFocus
          onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
          onBlur={saveRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRename()
            if (e.key === 'Escape') setRenaming(null)
          }}
        />
      ) : (
        <button type="button" className="flex-1 truncate text-start text-sm font-medium text-slate-800" onClick={onSelect}>
          {item.name}
        </button>
      )}
      <IconBtn title={t('rename', lang)} tone="brand" onClick={() => setRenaming({ id: item.id, name: item.name })}>
        <Pencil size={14} />
      </IconBtn>
      <IconBtn title={t('delete', lang)} tone="danger" onClick={() => remove(item.id)}>
        <Trash2 size={14} />
      </IconBtn>
    </li>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('nature', lang)}</div>
        <ul className="mb-3 max-h-[min(28rem,55vh)] space-y-0.5 overflow-auto text-sm">
          {cats.map((c) => (
            <Row
              key={c.id}
              item={c}
              selected={c.id === natId}
              onSelect={() => {
                setNatId(c.id)
                setDesId(null)
              }}
            />
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            className={inputClass}
            placeholder={t('newNature', lang)}
            value={draft.n}
            onChange={(e) => setDraft({ ...draft, n: e.target.value })}
          />
          <Btn
            size="sm"
            onClick={() => {
              add(draft.n, null, 1)
              setDraft({ ...draft, n: '' })
            }}
          >
            {t('add', lang)}
          </Btn>
        </div>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('designation', lang)}</div>
        <ul className="mb-3 max-h-[min(28rem,55vh)] space-y-0.5 overflow-auto text-sm">
          {designations.map((c) => (
            <Row key={c.id} item={c} selected={c.id === desId} onSelect={() => setDesId(c.id)} />
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            className={inputClass}
            placeholder={t('newDesignation', lang)}
            value={draft.d}
            disabled={!nat}
            onChange={(e) => setDraft({ ...draft, d: e.target.value })}
          />
          <Btn
            size="sm"
            disabled={!nat}
            onClick={() => {
              if (!nat) return
              add(draft.d, nat.id, 2)
              setDraft({ ...draft, d: '' })
            }}
          >
            {t('add', lang)}
          </Btn>
        </div>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('detail1', lang)}</div>
        <ul className="mb-3 max-h-[min(28rem,55vh)] space-y-0.5 overflow-auto text-sm">
          {details.map((c) => (
            <Row key={c.id} item={c} selected={false} onSelect={() => setRenaming({ id: c.id, name: c.name })} />
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            className={inputClass}
            placeholder={t('newDetail', lang)}
            value={draft.t}
            disabled={!desId}
            onChange={(e) => setDraft({ ...draft, t: e.target.value })}
          />
          <Btn
            size="sm"
            disabled={!desId}
            onClick={() => {
              if (!desId) return
              add(draft.t, desId, 3)
              setDraft({ ...draft, t: '' })
            }}
          >
            {t('add', lang)}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function VehicleForm() {
  const { refresh, lang, user } = useApp()
  const [name, setName] = useState('')
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <input className={`${inputClass} max-w-md flex-1`} placeholder={t('name', lang)} value={name} onChange={(e) => setName(e.target.value)} />
      <Btn
        onClick={() => {
          if (!name.trim()) return
          run('INSERT INTO vehicles (name) VALUES (?)', [name.trim()])
          audit(user?.id ?? null, 'create', 'vehicle', lastId())
          persist()
          setName('')
          refresh()
        }}
      >
        {t('add', lang)}
      </Btn>
    </div>
  )
}
