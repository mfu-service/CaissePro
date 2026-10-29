import { all } from './db'
import type { Category, Party, Vehicle } from './types'

const VEHICLE_DESIG = new Set(['Voyages', 'Déplacements', 'Véhicules', 'Impôts_taxes'])

export function natures(): Category[] {
  return all<Category>('SELECT * FROM categories WHERE level = 1 ORDER BY id')
}

export function childrenOf(parentId: number): Category[] {
  return all<Category>('SELECT * FROM categories WHERE parent_id = ? ORDER BY name', [parentId])
}

export function childrenNamed(parentName: string): Category[] {
  const parent = all<Category>('SELECT * FROM categories WHERE name = ? AND parent_id IS NULL', [parentName])[0]
  if (!parent) return []
  return childrenOf(parent.id)
}

export function designationsFor(nature: string): string[] {
  return childrenNamed(nature).map((c) => c.name)
}

export function detailsFor(nature: string, designation: string): string[] {
  const nat = all<Category>('SELECT * FROM categories WHERE name = ? AND level = 1', [nature])[0]
  if (!nat) return []
  const des = all<Category>('SELECT * FROM categories WHERE parent_id = ? AND name = ?', [nat.id, designation])[0]
  if (!des) return []
  return childrenOf(des.id).map((c) => c.name)
}

export function partiesOf(kind: string): Party[] {
  return all<Party>('SELECT * FROM parties WHERE kind = ? AND active = 1 ORDER BY name', [kind])
}

export function vehicles(): Vehicle[] {
  return all<Vehicle>('SELECT * FROM vehicles WHERE active = 1 ORDER BY name')
}

export type CascadeOptions = {
  designations: string[]
  detail1: string[]
  detail2: { label: string; values: string[] }
}

export function cascadeOptions(nature: string, designation: string): CascadeOptions {
  const designations = designationsFor(nature)
  let detail1 = detailsFor(nature, designation)
  let detail2: CascadeOptions['detail2'] = { label: '', values: [] }

  if (nature === 'Fournisseurs' || designation === 'Marchandises') {
    detail2 = { label: 'fournisseurs', values: partiesOf('fournisseur').map((p) => p.name) }
  } else if (nature === 'Associés') {
    detail1 = designations.length && !detail1.length ? designationsFor('Associés') : detail1
    detail2 = { label: 'associes', values: partiesOf('associe').map((p) => p.name) }
  } else if (nature === 'Frais' && designation === 'Salaires') {
    detail2 = { label: 'collaborators', values: partiesOf('collaborateur').map((p) => p.name) }
  } else if (nature === 'Frais' && designation === 'Transport') {
    detail2 = { label: 'transporteurs', values: partiesOf('transporteur').map((p) => p.name) }
  } else if (VEHICLE_DESIG.has(designation) || designation === 'Assurance véhicule') {
    detail2 = { label: 'vehicles', values: vehicles().map((v) => v.name) }
  } else if (nature === 'Recettes' && designation === 'PAIEMENT CLIENT') {
    detail2 = { label: 'clients', values: partiesOf('client').map((p) => p.name) }
  } else {
    detail2 = { label: 'collaborators', values: partiesOf('collaborateur').map((p) => p.name) }
  }

  if (nature === 'Fournisseurs' && !detail1.length) {
    detail1 = partiesOf('fournisseur').map((p) => p.name)
  }

  return { designations, detail1, detail2 }
}
