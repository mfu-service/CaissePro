import { all, lastId, one, persist, run } from './db'
import type { Category } from './types'

export function addCategory(name: string, parentId: number | null, level: number): number {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('required')
  const existing = parentId
    ? one<Category>('SELECT * FROM categories WHERE parent_id = ? AND name = ?', [parentId, trimmed])
    : one<Category>('SELECT * FROM categories WHERE parent_id IS NULL AND name = ?', [trimmed])
  if (existing) return existing.id
  run('INSERT INTO categories (parent_id, level, name) VALUES (?, ?, ?)', [parentId, level, trimmed])
  const id = lastId()
  persist()
  return id
}

export function renameCategory(id: number, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  run('UPDATE categories SET name = ? WHERE id = ?', [trimmed, id])
  persist()
}

export function deleteCategory(id: number): void {
  const kids = all<Category>('SELECT * FROM categories WHERE parent_id = ?', [id])
  for (const k of kids) deleteCategory(k.id)
  run('DELETE FROM categories WHERE id = ?', [id])
  persist()
}

export function natureByName(name: string): Category | undefined {
  return one<Category>('SELECT * FROM categories WHERE name = ? AND level = 1', [name])
}

export function designationOf(natureName: string, designationName: string): Category | undefined {
  const nat = natureByName(natureName)
  if (!nat) return undefined
  return one<Category>('SELECT * FROM categories WHERE parent_id = ? AND name = ?', [nat.id, designationName])
}

export function addNature(name: string): number {
  return addCategory(name, null, 1)
}

export function addDesignation(natureName: string, name: string): number {
  const nat = natureByName(natureName)
  const parentId = nat?.id ?? addNature(natureName)
  return addCategory(name, parentId, 2)
}

export function addDetail(natureName: string, designationName: string, name: string): number {
  const des = designationOf(natureName, designationName)
  const parentId = des?.id ?? addDesignation(natureName, designationName)
  return addCategory(name, parentId, 3)
}
