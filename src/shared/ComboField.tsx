import { Check, ChevronDown, Plus } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/types'
import { inputTriggerClass } from './ui'

type Props = {
  value: string
  options: string[]
  onChange: (value: string) => void
  allowAdd?: boolean
  onAdd?: (name: string) => void
  placeholder?: string
  lang: Lang
  disabled?: boolean
  allowEmpty?: boolean
}

export function ComboField({
  value,
  options,
  onChange,
  allowAdd,
  onAdd,
  placeholder,
  lang,
  disabled,
  allowEmpty,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [box, setBox] = useState({ top: 0, left: 0, width: 240, maxH: 280 })

  const unique = useMemo(() => [...new Set(options.filter(Boolean))], [options])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? unique.filter((o) => o.toLowerCase().includes(q)) : unique
    return allowEmpty ? ['', ...list] : list
  }, [unique, query, allowEmpty])
  const canAdd = Boolean(allowAdd && query.trim() && !unique.some((o) => o.toLowerCase() === query.trim().toLowerCase()))
  const items = canAdd ? [...filtered, `__add__:${query.trim()}`] : filtered

  const place = () => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom - 12
    const spaceAbove = r.top - 12
    const maxH = Math.min(320, Math.max(160, spaceBelow < 160 ? spaceAbove : spaceBelow))
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
    setBox({
      top: openUp ? r.top - maxH - 4 : r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
      maxH,
    })
  }

  useEffect(() => {
    if (!open) return
    place()
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-combo-panel]')) {
        setOpen(false)
        setQuery('')
      }
    }
    const onReposition = () => place()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const pick = (item: string) => {
    if (item.startsWith('__add__:')) {
      const name = item.slice(8)
      onAdd?.(name)
      onChange(name)
    } else {
      onChange(item)
    }
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className={inputTriggerClass}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
          setQuery('')
          setActive(0)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className={value ? 'truncate text-slate-900' : 'truncate text-slate-400'}>
          {value || placeholder || t('choose', lang)}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        createPortal(
          <div
            data-combo-panel
            id={listId}
            className="fixed z-[80] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxH }}
          >
            <div className="border-b border-slate-100 p-2">
              <input
                ref={inputRef}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-teal-600"
                placeholder={t('search', lang)}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActive((i) => Math.min(items.length - 1, i + 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActive((i) => Math.max(0, i - 1))
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    const item = items[active]
                    if (item != null) pick(item)
                  } else if (e.key === 'Escape') {
                    setOpen(false)
                    setQuery('')
                  }
                }}
              />
            </div>
            <ul className="max-h-64 overflow-auto py-1" role="listbox">
              {items.map((item, i) => {
                const isAdd = item.startsWith('__add__:')
                const label = isAdd ? item.slice(8) : item || '—'
                const selected = !isAdd && item === value
                return (
                  <li key={`${item}-${i}`}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm ${
                        i === active ? 'bg-teal-50' : 'hover:bg-slate-50'
                      } ${selected ? 'font-semibold text-teal-800' : 'text-slate-800'}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(item)}
                    >
                      {isAdd ? (
                        <Plus size={14} className="text-teal-700" />
                      ) : selected ? (
                        <Check size={14} className="text-teal-700" />
                      ) : (
                        <span className="w-3.5" />
                      )}
                      <span className="truncate">
                        {isAdd ? `${t('add', lang)} « ${label} »` : label}
                      </span>
                    </button>
                  </li>
                )
              })}
              {!items.length && (
                <li className="px-3 py-3 text-sm text-slate-400">{t('noMatch', lang)}</li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}
