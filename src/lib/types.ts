export type Role = 'admin' | 'cashier' | 'accountant'
export type Lang = 'fr' | 'ar'

export type User = {
  id: number
  username: string
  display_name: string
  role: Role
  active: number
}

export type Account = {
  id: number
  code: string
  name_fr: string
  name_ar: string
  kind: string
  opening_balance: number
  opening_date: string | null
  active: number
  sort_order: number
}

export type Category = {
  id: number
  parent_id: number | null
  level: number
  name: string
  name_ar: string | null
}

export type Party = {
  id: number
  kind: string
  name: string
  phone: string | null
  notes: string | null
  active: number
}

export type Vehicle = {
  id: number
  name: string
  active: number
}

export type Movement = {
  id: number
  account_id: number
  date: string
  daily_code: number
  nature: string
  designation: string | null
  detail1: string | null
  detail2: string | null
  remarks: string | null
  engagement: string | null
  entree: number
  sortie: number
  transfer_pair_id: string | null
  created_at: string
  created_by: number | null
}

export type MovementRow = Movement & { solde: number }

export type Receivable = {
  id: number
  party_id: number | null
  client_name: string
  debit: number
  credit: number
  status: string | null
  invoice_date: string | null
  phone: string | null
  notes: string | null
}

export type TransportEntry = {
  id: number
  date: string
  amount: number
  carrier: string | null
  parcels: number | null
  direction: string | null
  notes: string | null
  movement_id: number | null
}

export type DayClose = {
  id: number
  account_id: number
  date: string
  theoretical: number
  counted: number
  difference: number
  notes: string | null
  closed_by: number | null
  closed_at: string
}

export type Attachment = {
  id: number
  movement_id: number
  filename: string
  mime: string | null
  data_url: string
}

export type CompanyProfile = {
  name_ar: string
  name_fr: string
  legal_form: string
  address: string
  city: string
  phone: string
  email: string
  website: string
  rc: string
  nif: string
  nis: string
  ai: string
  fiscal_year: string
  fiscal_start: string
  logo_data_url: string
  backup_path: string
  setup_done: string
}

export type ImportReport = {
  accepted: number
  skipped: number
  flaggedDates: number
  unknownNatures: string[]
  balances: { account: string; net: number }[]
  messages: string[]
}
