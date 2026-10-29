export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','cashier','accountant')),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  kind TEXT NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  opening_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id),
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT
);

CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  date TEXT NOT NULL,
  daily_code INTEGER NOT NULL,
  nature TEXT NOT NULL,
  designation TEXT,
  detail1 TEXT,
  detail2 TEXT,
  remarks TEXT,
  engagement TEXT,
  entree REAL NOT NULL DEFAULT 0,
  sortie REAL NOT NULL DEFAULT 0,
  transfer_pair_id TEXT,
  created_at TEXT NOT NULL,
  created_by INTEGER,
  updated_at TEXT,
  updated_by INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mov_acc_date ON movements(account_id, date, daily_code, id);
CREATE INDEX IF NOT EXISTS idx_mov_nature ON movements(nature);

CREATE TABLE IF NOT EXISTS receivables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER REFERENCES parties(id),
  client_name TEXT NOT NULL,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  status TEXT,
  invoice_date TEXT,
  phone TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS transport_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  carrier TEXT,
  parcels INTEGER,
  direction TEXT,
  notes TEXT,
  movement_id INTEGER REFERENCES movements(id)
);

CREATE TABLE IF NOT EXISTS day_closes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  date TEXT NOT NULL,
  theoretical REAL NOT NULL,
  counted REAL NOT NULL,
  difference REAL NOT NULL,
  notes TEXT,
  closed_by INTEGER,
  closed_at TEXT NOT NULL,
  UNIQUE(account_id, date)
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movement_id INTEGER NOT NULL REFERENCES movements(id),
  filename TEXT NOT NULL,
  mime TEXT,
  data_url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT
);
`

type CatNode = { name: string; name_ar?: string; children?: CatNode[] }

export const CATEGORY_TREE: CatNode[] = [
  {
    name: 'Solde départ',
    name_ar: 'رصيد الافتتاح',
  },
  {
    name: 'Recettes',
    name_ar: 'مداخيل',
    children: [
      { name: 'POS L 04' },
      { name: 'VENTE L 04' },
      { name: 'PAIEMENT CLIENT' },
      { name: 'TPE' },
      { name: 'CCP BACHIR' },
      { name: 'Client' },
      { name: 'Services' },
      { name: 'Hors Exploitation' },
    ],
  },
  {
    name: 'Transfert',
    name_ar: 'تحويل',
    children: [
      { name: 'CPELD' },
      { name: 'CPALG' },
      { name: 'CCP BACHIR' },
      { name: 'BARAKA BACHIR' },
      { name: 'TPE' },
      { name: 'Cheque' },
      { name: 'L 01' },
      { name: 'L02' },
      { name: 'L03' },
      { name: 'L 04' },
      { name: 'Banque 02' },
      { name: 'Banque 03' },
    ],
  },
  {
    name: 'Fournisseurs',
    name_ar: 'موردون',
    children: [{ name: 'Marchandises' }, { name: 'Services' }],
  },
  {
    name: 'Investissements',
    name_ar: 'استثمارات',
    children: [
      { name: 'Matériels roulants' },
      { name: 'Logiciel' },
      { name: 'Equipements informatique' },
      { name: 'Mobilier' },
      { name: 'Aménagement' },
      { name: 'Résidence' },
    ],
  },
  {
    name: 'Associés',
    name_ar: 'شركاء',
    children: [
      { name: 'Salaire Fixe' },
      { name: 'Salaire Variable' },
      { name: 'Avance associé' },
      { name: 'Retrait bénéfice' },
      { name: 'Retrait capital' },
      { name: 'Apport capital' },
    ],
  },
  {
    name: 'Frais',
    name_ar: 'مصاريف',
    children: [
      {
        name: 'Administratives',
        children: [
          { name: 'Assurance véhicule' },
          { name: 'Assurance infrastructures' },
          { name: 'Comptable' },
          { name: 'Abonnements' },
          { name: 'CNAS' },
          { name: 'CASNOS' },
        ],
      },
      { name: 'Assurance' },
      {
        name: 'Fournitures',
        children: [{ name: 'Bureautiques' }, { name: 'Outils de travail' }],
      },
      {
        name: 'Communication',
        children: [{ name: 'Mobile' }, { name: 'Fixe' }, { name: 'Fax' }, { name: 'Internet' }],
      },
      {
        name: 'Déjeuner',
        children: [{ name: 'Cuisine' }, { name: 'Restaurant' }, { name: 'Collation' }],
      },
      {
        name: 'Déplacements',
        children: [
          { name: 'Parking' },
          { name: 'Taxi' },
          { name: 'Bus' },
          { name: 'Billet' },
          { name: 'Déjeuner' },
          { name: 'Gasoil' },
          { name: 'Hôtel' },
        ],
      },
      {
        name: 'Energie',
        children: [{ name: 'Elec_Gaz' }, { name: 'Eau' }],
      },
      {
        name: 'Entretien',
        children: [
          { name: 'Equipement' },
          { name: 'Infrastructure' },
          { name: 'Nettoyage' },
          { name: 'Femme de ménage' },
          { name: 'Matériel informatique' },
        ],
      },
      { name: 'Formation' },
      {
        name: 'Impôts_taxes',
        children: [{ name: 'G 50' }, { name: 'C 20' }, { name: 'IRG' }, { name: 'IBS' }, { name: 'Rôle' }],
      },
      { name: 'Location' },
      {
        name: 'Publicité',
        children: [{ name: 'Impression' }, { name: 'Web' }, { name: 'Foires' }, { name: 'Autres' }],
      },
      { name: 'Résidence' },
      {
        name: 'Salaires',
        children: [
          { name: 'Salaire Fixe' },
          { name: 'Salaire Variable' },
          { name: 'Avances' },
          { name: 'Acompte' },
        ],
      },
      {
        name: 'Transport',
        children: [{ name: 'Colis' }, { name: 'Transport BUS' }],
      },
      {
        name: 'Véhicules',
        children: [
          { name: 'Gasoil' },
          { name: 'Lavage' },
          { name: 'Entretien' },
          { name: 'Réparation' },
          { name: 'Pièces détachées' },
          { name: 'Accessoires' },
        ],
      },
      {
        name: 'Voyages',
        children: [{ name: 'Visa' }, { name: 'Frais voyages' }, { name: 'Hôtel' }, { name: 'Billet' }],
      },
    ],
  },
  {
    name: 'Emprunts',
    name_ar: 'قروض',
  },
  {
    name: 'Instances',
    name_ar: 'عمليات معلقة',
    children: [{ name: 'Mission' }, { name: 'Achat' }, { name: 'Voyages' }, { name: 'Sortie' }, { name: 'DETTE' }],
  },
  {
    name: 'Décalages',
    name_ar: 'فوارق',
  },
]

export const SEED_ACCOUNTS = [
  { code: 'CPELD_ESPECE', name_fr: 'Caisse espèces', name_ar: 'صندوق نقدي', kind: 'cash', sort_order: 1 },
  { code: 'CCP_BACHIR', name_fr: 'CCP', name_ar: 'حساب CCP', kind: 'ccp', sort_order: 2 },
  { code: 'TPE', name_fr: 'TPE', name_ar: 'جهاز الدفع', kind: 'tpe', sort_order: 3 },
  { code: 'CHEQUE', name_fr: 'Chèques', name_ar: 'شيكات', kind: 'cheque', sort_order: 4 },
]

export const SEED_PARTIES: { kind: string; name: string }[] = [
  { kind: 'collaborateur', name: 'SBAA AYOUB' },
  { kind: 'collaborateur', name: 'BEN AUMER BILAL' },
  { kind: 'collaborateur', name: 'MESAI BELKACEM' },
  { kind: 'collaborateur', name: 'MEHI DINE SOFIANE' },
  { kind: 'collaborateur', name: 'DADDA MOSSA' },
  { kind: 'collaborateur', name: 'NACER EDDINE' },
  { kind: 'collaborateur', name: 'MOHAMED BLOUHI' },
  { kind: 'collaborateur', name: 'DADDA ABDULLAH' },
  { kind: 'associe', name: 'ADAIKA ABDALLAH' },
  { kind: 'associe', name: 'ADAIKA BACHIR' },
  { kind: 'associe', name: 'ADAIKA RIADH' },
  { kind: 'associe', name: 'ADAIKA ANOUAR' },
  { kind: 'associe', name: 'ADAIKA HOUSSAM' },
  { kind: 'transporteur', name: 'Transporteur 01' },
  { kind: 'transporteur', name: 'Transporteur 02' },
  { kind: 'transporteur', name: 'Transporteur 03' },
  { kind: 'transporteur', name: 'Transporteur 04' },
]

export const SEED_VEHICLES = ['véhicule 01', 'véhicule 02', 'véhicule 03', 'véhicule 04']

export const DEFAULT_COMPANY: Record<string, string> = {
  name_ar: 'اسم المؤسسة',
  name_fr: "Nom de l'entreprise",
  legal_form: 'Ets',
  address: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  rc: '',
  nif: '',
  nis: '',
  ai: '',
  fiscal_year: '2025',
  fiscal_start: '2025-01-01',
  logo_data_url: '',
  backup_path: '',
  setup_done: '0',
  allow_negative: '1',
  lang: 'fr',
  nav_layout: 'top',
}
