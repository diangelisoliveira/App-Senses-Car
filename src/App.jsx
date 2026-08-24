import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowDown, BarChart3, CalendarRange, Check, ChevronDown,
  CircleHelp, Download, FileDown, FileSpreadsheet, FileText, Filter, Gauge, Medal, Plus, RefreshCw, Search,
  BadgeDollarSign, Settings, ShieldCheck, Sparkles, Target, Trash2, Upload, UsersRound, X, LogOut
} from 'lucide-react';
import { CONSULTANTS } from './consultants';
import AuthGate, { supabase } from './AuthGate';
import fiatLogo from './assets/brands/fiat.svg';
import jeepLogo from './assets/brands/jeep.svg';
import nissanLogo from './assets/brands/nissan.svg';
import bydLogo from './assets/brands/byd.svg';
import sensesCarLogoWhite from './assets/senses-car-logo-white.png';
import sensesCarLogoBlack from './assets/senses-car-logo-black.png';

// A única fonte de logos das montadoras. Importar pelo bundle evita URLs relativas
// que podem deixar de resolver quando o aplicativo roda empacotado no Electron.
const BRAND_LOGOS = Object.freeze({ Fiat: fiatLogo, Jeep: jeepLogo, Nissan: nissanLogo, BYD: bydLogo });

const KEY = 'senses-car-records-v1';
const COMMISSIONS_KEY = 'senses-car-commissions-v1';
const BRAND_STORES = Object.freeze({
  Fiat: ['NAÇÕES UNIDAS', 'CEASA', 'ARICANDUVA', 'OSASCO'],
  Jeep: ['SUMARÉ', 'ARICANDUVA', 'CEASA', 'GUARULHOS', 'WASHINGTON LUIZ', 'VILA GUILHERME'],
  Nissan: ['BRAZ LEME', 'CEASA'],
  BYD: ['SANTO AMARO/ITAIM', 'W. LUIZ (AEROPORTO)', 'CEASA', 'ARICANDUVA', 'VILA GUILHERME']
});
const BRAND_MANAGERS = Object.freeze({
  Fiat: { 'NAÇÕES UNIDAS': 'ADRIANO AMORIM', CEASA: 'FELIPE MARTINS', ARICANDUVA: 'HENRIQUE FERREIRA', OSASCO: 'ARTHUR RODRIGO' },
  Jeep: { 'SUMARÉ': 'IZALTO FERREIRA', ARICANDUVA: 'DIEGO ROBERTO', CEASA: 'WALDYR BERTOLACINI', GUARULHOS: 'ALINE PEREIRA', 'WASHINGTON LUIZ': 'CARLOS EDUARDO', 'VILA GUILHERME': 'ERASMO RODRIGUES' },
  Nissan: { 'BRAZ LEME': 'DIEGO ROBERTO', CEASA: 'PATRICK WALLACE' },
  BYD: { 'SANTO AMARO/ITAIM': 'SPENCER', 'W. LUIZ (AEROPORTO)': 'EVANDRO', CEASA: 'THAIS GÓES', ARICANDUVA: 'LEONARDO TOTH', 'VILA GUILHERME': 'CRISTIANE HENRIQUE' }
});
const CURRENT_MANAGER_OVERRIDES = Object.freeze({
  Fiat: Object.freeze({ ARICANDUVA: 'HENRIQUE FERREIRA' }),
  Jeep: Object.freeze({ ARICANDUVA: 'DIEGO ROBERTO' }),
});
const DEFAULT_CATALOG = Object.freeze({ brands: Object.keys(BRAND_LOGOS), stores: BRAND_STORES, managers: BRAND_MANAGERS, consultants: CONSULTANTS });
const EMPTY_FORM = { date: new Date().toISOString().slice(0, 10), brand: '', store: '', consultant: '', passages: '', kits: '', note: '' };
const META_TARGET = 40;
const EMPTY_FILTERS = Object.freeze({ from: '', to: '', brand: '', store: '', manager: '', consultant: '' });
const EMPTY_REPORT_FILTERS = Object.freeze({ ...EMPTY_FILTERS, status: '' });
const EMPTY_COMMISSION_FILTERS = Object.freeze({ month: '', brands: [], stores: [], manager: '', consultant: '' });
const CATALOG_KEY = 'senses-car-catalog-v1';
const JUNE_MANAGER_COMMISSION_COMPETENCE = '2026-06';
const JUNE_MANAGER_COMMISSION_TYPE = 'Comissão por Aproveitamento Gerente';
const JUNE_MANAGER_COMMISSION_VALUE = 1000;
// Referência fechada da planilha oficial de Junho/2026. A apuração de
// Gerentes dessa competência deve conter somente estas unidades, nomes e valores.
// "W. Luiz" na referência corresponde à loja canônica "WASHINGTON LUIZ".
const JUNE_MANAGER_COMMISSION_REFERENCE = Object.freeze({
  Fiat: Object.freeze({
    ARICANDUVA: Object.freeze({ manager: 'José Elias da C. Silva', commissionValue: 0 }),
    CEASA: Object.freeze({ manager: 'Felipe Martins Dominguez', commissionValue: 1000 }),
    'NAÇÕES UNIDAS': Object.freeze({ manager: 'Adriano Amorim Dos Santos', commissionValue: 1000 }),
    OSASCO: Object.freeze({ manager: 'Arthur Rodrigo de Souza', commissionValue: 0 }),
  }),
  Jeep: Object.freeze({
    ARICANDUVA: Object.freeze({ manager: 'Larissa Trivelato Suguimoto', commissionValue: 1000 }),
    CEASA: Object.freeze({ manager: 'Waldyr Bertolacini Junior', commissionValue: 1000 }),
    GUARULHOS: Object.freeze({ manager: 'Aline Pereira Cardoso', commissionValue: 1000 }),
    SUMARÉ: Object.freeze({ manager: 'Izalto Ferreira Guimarães Junior', commissionValue: 1000 }),
    'VILA GUILHERME': Object.freeze({ manager: 'Erasmo Rodrigues da Costa', commissionValue: 0 }),
    'WASHINGTON LUIZ': Object.freeze({ manager: 'Carlos Eduardo Mendes', commissionValue: 0 }),
  }),
  Nissan: Object.freeze({
    'BRAZ LEME': Object.freeze({ manager: 'Diego Roberto Horvath', commissionValue: 1000 }),
    CEASA: Object.freeze({ manager: 'Patrick Wallace dos Santos Plácido', commissionValue: 1000 }),
  }),
});
const UNIT_STATUS_ACTIVE = 'Ativa';
const UNIT_STATUS_DISCONTINUED = 'Descontinuada';
const DISCONTINUED_UNIT_EFFECTIVE_DATE = '2026-07-01';
const DISCONTINUED_UNIT_EFFECTIVE_MONTH = DISCONTINUED_UNIT_EFFECTIVE_DATE.slice(0, 7);
const JULY_MANAGER_COMMISSION_COMPETENCE = '2026-07';
const JULY_MANAGER_COMMISSION_TYPE = 'Comissão por Kits Gerente Julho/2026';
const JULY_MANAGER_COMMISSION_TARGET_RATE = 5;
const JULY_MANAGER_COMMISSION_BELOW_TARGET_RATE = 2.5;
const JULY_BYD_COMMISSION_NOTE = 'Comissão de Julho/2026 da BYD mantida em R$ 0,00; será apurada com referência ao mês fechado de Agosto/2026.';
const DISCONTINUED_UNIT_RULES = Object.freeze([
  Object.freeze({ brand: 'Nissan', store: 'BRAZ LEME', effectiveFrom: DISCONTINUED_UNIT_EFFECTIVE_DATE }),
]);
const MANAGER_COMMISSION_TYPE = 'Comissão Fixa Gerente';
const MANAGER_COMMISSION_COMPETENCE = '2026-05';
const CONSULTANT_COMMISSION_REFERENCE_COMPETENCE = '2026-06';
const CONSULTANT_COMMISSION_REFERENCE_COMPETENCES = Object.freeze(['2026-06', '2026-07']);
const CONSULTANT_COMMISSION_COMPETENCES = Object.freeze(['2026-05', '2026-06', '2026-07']);
const CONSULTANT_COMMISSION_TYPE = 'Comissão por Aproveitamento Consultor';
const CONSULTANT_COMMISSION_TARGET_RATE = 15;
const CONSULTANT_COMMISSION_BELOW_TARGET_RATE = 7.5;

// Relação histórica: a responsabilidade é definida por Competência + Marca + Loja.
// "W. Luiz" é o alias documentado para a loja canônica "WASHINGTON LUIZ" do catálogo.
const HISTORICAL_MANAGER_BY_COMPETENCE = Object.freeze({
  '2026-05': Object.freeze({
    Fiat: Object.freeze({
      ARICANDUVA: 'José Elias da C. Silva',
      CEASA: 'Felipe Martins Dominguez',
      'NAÇÕES UNIDAS': 'Adriano Amorim Dos Santos',
      OSASCO: 'Arthur Rodrigo de Souza',
    }),
    Jeep: Object.freeze({
      ARICANDUVA: 'Larissa Trivelato Suguimoto',
      CEASA: 'Waldyr Bertolacini Junior',
      GUARULHOS: 'Aline Pereira Cardoso',
      SUMARÉ: 'Izalto Ferreira Guimarães Junior',
      'VILA GUILHERME': 'Erasmo Rodrigues da Costa',
      'WASHINGTON LUIZ': 'Carlos Eduardo Mendes',
    }),
    Nissan: Object.freeze({
      'BRAZ LEME': 'Diego Roberto Horvath',
      CEASA: 'Patrick Wallace dos Santos Plácido',
    }),
  }),
  '2026-06': Object.freeze({
    Fiat: Object.freeze({
      ARICANDUVA: 'José Elias da C. Silva',
      CEASA: 'Felipe Martins Dominguez',
      'NAÇÕES UNIDAS': 'Adriano Amorim Dos Santos',
      OSASCO: 'Arthur Rodrigo de Souza',
    }),
    Jeep: Object.freeze({
      ARICANDUVA: 'Larissa Trivelato Suguimoto',
      CEASA: 'Waldyr Bertolacini Junior',
      GUARULHOS: 'Aline Pereira Cardoso',
      SUMARÉ: 'Izalto Ferreira Guimarães Junior',
      'VILA GUILHERME': 'Erasmo Rodrigues da Costa',
      'WASHINGTON LUIZ': 'Carlos Eduardo Mendes',
    }),
    Nissan: Object.freeze({
      'BRAZ LEME': 'Diego Roberto Horvath',
      CEASA: 'Patrick Wallace dos Santos Plácido',
    }),
  }),
  '2026-07': Object.freeze({
    Fiat: Object.freeze({ ARICANDUVA: 'HENRIQUE FERREIRA' }),
    Jeep: Object.freeze({ ARICANDUVA: 'DIEGO ROBERTO' }),
    Nissan: Object.freeze({ 'BRAZ LEME': 'DIEGO ROBERTO' }),
  }),
});

const isAdminProfile = (profile) => profile?.role === 'admin' && profile?.is_active === true;
const isManagerProfile = (profile) => profile?.role === 'gerente' && profile?.is_active === true;

const norm = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const CP1252_BYTE_BY_CHAR = Object.freeze({
  '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
  '\u02c6': 0x88, '\u2030': 0x89, '\u0160': 0x8a, '\u2039': 0x8b, '\u0152': 0x8c, '\u017d': 0x8e,
  '\u2018': 0x91, '\u2019': 0x92, '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203a': 0x9b, '\u0153': 0x9c, '\u017e': 0x9e, '\u0178': 0x9f
});
const repairMojibake = (value) => {
  let text = String(value ?? '').trim();
  for (let attempt = 0; attempt < 2 && /[ÃÂâ]/.test(text); attempt += 1) {
    try {
      const bytes = [...text].map((character) => {
        const code = character.codePointAt(0);
        const byte = code <= 0xff ? code : CP1252_BYTE_BY_CHAR[character];
        if (byte === undefined) throw new Error('Unsupported mojibake character');
        return byte;
      });
      const repaired = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      if (repaired === text) break;
      text = repaired;
    } catch {
      break;
    }
  }
  return text;
};
const number = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '').replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};
const percent = (kits, passages) => {
  const total = number(passages);
  if (!total) return '0%';
  return `${Math.round((number(kits) / total) * 100).toLocaleString('pt-BR')}%`;
};
const rate = (kits, passages) => {
  const total = number(passages);
  return total ? (number(kits) / total) * 100 : 0;
};
const roundedPercent = (kits, passages) => `${Math.round(rate(kits, passages)).toLocaleString('pt-BR')}%`;
const validateManualLaunchMetrics = (passagesValue, kitsValue) => {
  const passagesText = String(passagesValue ?? '').trim();
  const kitsText = String(kitsValue ?? '').trim();
  const isNonNegativeInteger = (value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
  if (!isNonNegativeInteger(passagesText) || !isNonNegativeInteger(kitsText)) {
    return { ok: false, message: 'Informe Passagens e Kits Vendidos como números inteiros.' };
  }
  const passages = Number(passagesText);
  const kits = Number(kitsText);
  if (kits > passages) return { ok: false, message: 'Kits Vendidos não podem ser maiores que Passagens.' };
  return { ok: true, passages, kits };
};
const isOnTarget = (value) => Number(value) >= META_TARGET;
const dateKey = (item) => {
  // Filtros executivos usam a competência do lançamento; importedAt continua
  // preservado para a coluna histórica de Data da Importação nos relatórios.
  const raw = item?.date || item?.importDate || item?.importedAt;
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return String(raw);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? String(raw).slice(0, 10) : new Intl.DateTimeFormat('sv-SE').format(date);
};
const withinDateRange = (item, filters = {}) => {
  const date = dateKey(item);
  if (filters.from && (!date || date < filters.from)) return false;
  if (filters.to && (!date || date > filters.to)) return false;
  return true;
};
const uniqueText = (values = []) => [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
const sumKits = (rows) => rows.reduce((total, item) => total + number(item.kits), 0);
const accessUnitKey = (brand, store) => `${norm(brand)}|${norm(store)}`;
const unitIdentityKey = (item) => accessUnitKey(item?.brand, item?.store);
const cloneCatalog = (catalog = DEFAULT_CATALOG) => {
  const source = catalog && typeof catalog === 'object' ? catalog : DEFAULT_CATALOG;
  return {
    brands: Array.isArray(source.brands) ? [...source.brands] : [...DEFAULT_CATALOG.brands],
    stores: Object.fromEntries(Object.entries(source.stores || {}).map(([brand, stores]) => [brand, Array.isArray(stores) ? [...stores] : []])),
    managers: Object.fromEntries(Object.entries(source.managers || {}).map(([brand, managers]) => [brand, { ...(managers || {}) }])),
    consultants: Object.fromEntries(Object.entries(source.consultants || {}).map(([brand, stores]) => [brand, Object.fromEntries(Object.entries(stores || {}).map(([store, consultants]) => [store, Array.isArray(consultants) ? [...consultants] : []]))]))
  };
};
const normalizeCatalog = (catalog) => {
  const source = catalog && typeof catalog === 'object' ? catalog : DEFAULT_CATALOG;
  const sourceStoresByBrand = Object.fromEntries(Object.entries(source.stores || {}).map(([brand, stores]) => [repairMojibake(brand), stores]));
  const sourceManagersByBrand = Object.fromEntries(Object.entries(source.managers || {}).map(([brand, managers]) => [repairMojibake(brand), managers]));
  const sourceConsultantsByBrand = Object.fromEntries(Object.entries(source.consultants || {}).map(([brand, stores]) => [repairMojibake(brand), stores]));
  const brands = uniqueText((Array.isArray(source.brands) ? source.brands : DEFAULT_CATALOG.brands).map(repairMojibake));
  const stores = {};
  const managers = {};
  const consultants = {};
  brands.forEach((brand) => {
    const defaultStores = (DEFAULT_CATALOG.stores[brand] || []).map(repairMojibake);
    const sourceStores = Object.prototype.hasOwnProperty.call(sourceStoresByBrand, brand) ? sourceStoresByBrand[brand] : defaultStores;
    stores[brand] = uniqueText((Array.isArray(sourceStores) ? sourceStores : defaultStores).map(repairMojibake));
    const defaultManagers = Object.fromEntries(Object.entries(DEFAULT_CATALOG.managers[brand] || {}).map(([store, manager]) => [repairMojibake(store), repairMojibake(manager)]));
    const sourceManagers = Object.fromEntries(Object.entries(sourceManagersByBrand[brand] || {}).map(([store, manager]) => [repairMojibake(store), repairMojibake(manager)]));
    const currentManagerOverrides = Object.fromEntries(Object.entries(CURRENT_MANAGER_OVERRIDES[brand] || {}).map(([store, manager]) => [repairMojibake(store), repairMojibake(manager)]));
    managers[brand] = { ...defaultManagers, ...sourceManagers, ...currentManagerOverrides };
    consultants[brand] = {};
    const sourceConsultantsByStore = Object.fromEntries(Object.entries(sourceConsultantsByBrand[brand] || {}).map(([store, values]) => [repairMojibake(store), values]));
    stores[brand].forEach((store) => {
      const defaultConsultants = (DEFAULT_CATALOG.consultants[brand]?.[store] || []).map(repairMojibake);
      const sourceConsultants = Object.prototype.hasOwnProperty.call(sourceConsultantsByStore, store) ? sourceConsultantsByStore[store] : defaultConsultants;
      consultants[brand][store] = uniqueText((Array.isArray(sourceConsultants) ? sourceConsultants : defaultConsultants).map(repairMojibake));
    });
  });
  return { brands, stores, managers, consultants };
};
const historicalStoreKey = (value) => {
  const cleaned = norm(value).replace(/[().]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned === 'w luiz' || cleaned === 'washington luiz') return 'washington luiz';
  return cleaned;
};
const competenceDateKey = (value) => {
  const raw = value && typeof value === 'object'
    ? value.date || value.competence || value.importDate || value.importedAt
    : value;
  if (!raw) return '';
  const text = String(raw).trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const month = text.match(/^(\d{4}-\d{2})$/);
  if (month) return `${month[1]}-01`;
  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (br) return `${br[3].length === 2 ? `20${br[3]}` : br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};
const competenceMonthKey = (value) => competenceDateKey(value).slice(0, 7);
const discontinuedUnitRuleFor = (brand, store) => DISCONTINUED_UNIT_RULES.find((rule) => norm(rule.brand) === norm(brand) && historicalStoreKey(rule.store) === historicalStoreKey(store));
const unitStatusFor = (brand, store, competence) => {
  const rule = discontinuedUnitRuleFor(brand, store);
  if (!rule) return UNIT_STATUS_ACTIVE;
  const date = competenceDateKey(competence) || new Date().toISOString().slice(0, 10);
  return date >= rule.effectiveFrom ? UNIT_STATUS_DISCONTINUED : UNIT_STATUS_ACTIVE;
};
const isUnitDiscontinuedFor = (brand, store, competence) => unitStatusFor(brand, store, competence) === UNIT_STATUS_DISCONTINUED;
const historicalManagerFor = (brand, store, competence) => {
  const month = competenceMonthKey(competence);
  const maps = [
    HISTORICAL_MANAGER_BY_COMPETENCE[month],
    month >= DISCONTINUED_UNIT_EFFECTIVE_MONTH ? HISTORICAL_MANAGER_BY_COMPETENCE[DISCONTINUED_UNIT_EFFECTIVE_MONTH] : null,
  ].filter(Boolean);
  for (const managerMap of maps) {
    const brandEntry = Object.entries(managerMap).find(([name]) => norm(name) === norm(brand));
    const storeEntry = Object.entries(brandEntry?.[1] || {}).find(([name]) => historicalStoreKey(name) === historicalStoreKey(store));
    if (storeEntry?.[1]) return storeEntry[1];
  }
  return '';
};
const catalogManagerFor = (catalog, brand, store) => {
  const brandEntry = Object.entries(catalog?.managers || {}).find(([name]) => norm(name) === norm(brand));
  const storeEntry = Object.entries(brandEntry?.[1] || {}).find(([name]) => historicalStoreKey(name) === historicalStoreKey(store));
  return storeEntry?.[1] || '';
};
const managerForCompetence = (catalog, brand, store, competence) => historicalManagerFor(brand, store, competence) || catalogManagerFor(catalog, brand, store);
const recordWithHistoricalManager = (catalog, item) => ({
  ...item,
  manager: historicalManagerFor(item.brand, item.store, item) || item.manager || catalogManagerFor(catalog, item.brand, item.store),
  unitStatus: unitStatusFor(item.brand, item.store, item),
});
const commissionIdentityKey = (item) => [
  competenceMonthKey(item),
  norm(item.brand),
  historicalStoreKey(item.store),
  norm(item.managerName || item.manager),
  norm(item.commissionType || item.type),
].join('|');
const commissionUnitIdentityKey = (item) => accessUnitKey(item?.brand, historicalStoreKey(item?.store));
const consultantCommissionUnitKey = (item) => commissionUnitIdentityKey({
  brand: repairMojibake(item?.brand || ''),
  store: repairMojibake(item?.store || ''),
});
const consultantCommissionReferenceCompetenceFor = (competence) => competence === '2026-05' || competence === '2026-06'
  ? CONSULTANT_COMMISSION_REFERENCE_COMPETENCE
  : competence === JULY_MANAGER_COMMISSION_COMPETENCE
    ? JULY_MANAGER_COMMISSION_COMPETENCE
    : '';
const applyConsultantCommissionRules = (records = []) => {
  const source = Array.isArray(records) ? records : [];
  const storeMetricsByCompetence = new Map();
  source.forEach((item) => {
    const competence = competenceMonthKey(item);
    if (!CONSULTANT_COMMISSION_REFERENCE_COMPETENCES.includes(competence)) return;
    const storeMetrics = storeMetricsByCompetence.get(competence) || new Map();
    const key = consultantCommissionUnitKey(item);
    const group = storeMetrics.get(key) || { passages: 0, kits: 0 };
    group.passages += number(item.passages);
    group.kits += number(item.kits);
    storeMetrics.set(key, group);
    storeMetricsByCompetence.set(competence, storeMetrics);
  });
  return source.map((item) => {
    const competence = competenceMonthKey(item);
    const referenceCompetence = consultantCommissionReferenceCompetenceFor(competence);
    if (!item?.consultant || !referenceCompetence) return item;
    const reference = storeMetricsByCompetence.get(referenceCompetence)?.get(consultantCommissionUnitKey(item)) || { passages: 0, kits: 0 };
    const referencePercentage = rate(reference.kits, reference.passages);
    const pricePerKit = isOnTarget(referencePercentage)
      ? CONSULTANT_COMMISSION_TARGET_RATE
      : CONSULTANT_COMMISSION_BELOW_TARGET_RATE;
    const isJulyByd = competence === JULY_MANAGER_COMMISSION_COMPETENCE && norm(repairMojibake(item.brand)) === 'byd';
    const commissionValue = isJulyByd ? 0 : Number((number(item.kits) * pricePerKit).toFixed(2));
    return {
      ...item,
      commissionType: item.commissionType || CONSULTANT_COMMISSION_TYPE,
      commissionValue,
      commission: commissionValue,
    };
  });
};
const juneManagerReferenceFor = (brand, store) => {
  const brandEntry = Object.entries(JUNE_MANAGER_COMMISSION_REFERENCE).find(([name]) => norm(name) === norm(brand));
  const storeEntry = Object.entries(brandEntry?.[1] || {}).find(([name]) => historicalStoreKey(name) === historicalStoreKey(store));
  return storeEntry?.[1] || null;
};
const isJuneManagerUnitIncluded = (item) => Boolean(juneManagerReferenceFor(item?.brand, item?.store));
const isJuneManagerExcludedRecord = (item) => competenceMonthKey(item) === JUNE_MANAGER_COMMISSION_COMPETENCE && !isJuneManagerUnitIncluded(item);
const FIXED_MANAGER_COMMISSION_SEED = Object.freeze(
  Object.entries(HISTORICAL_MANAGER_BY_COMPETENCE[MANAGER_COMMISSION_COMPETENCE] || {}).flatMap(([brand, stores]) => Object.entries(stores).map(([store, manager]) => ({
    id: `commission-manager-${MANAGER_COMMISSION_COMPETENCE}-${norm(brand)}-${historicalStoreKey(store).replace(/\s+/g, '-')}`,
    competence: MANAGER_COMMISSION_COMPETENCE,
    brand,
    store,
    managerId: `manager-${norm(manager).replace(/\s+/g, '-')}`,
    managerName: manager,
    manager,
    commissionType: MANAGER_COMMISSION_TYPE,
    type: MANAGER_COMMISSION_TYPE,
    commissionValue: 1000,
    status: 'Registrada',
    paymentDate: '',
    note: 'Comissão fixa definida para a competência Maio/2026.',
    createdAt: '2026-05-01T00:00:00.000Z',
  })))
);
const normalizeCommissionRecord = (item) => {
  const source = item && typeof item === 'object' ? item : {};
  const managerName = repairMojibake(source.managerName || source.manager || '');
  const commissionValue = source.commissionValue ?? source.value ?? source.commission ?? '';
  const brand = repairMojibake(source.brand || '');
  const store = repairMojibake(source.store || '');
  return {
    ...source,
    competence: competenceMonthKey(source.competence || source.date || source.importDate || source.importedAt),
    brand,
    store,
    managerName,
    manager: managerName,
    commissionType: repairMojibake(source.commissionType || source.type || ''),
    commissionValue: commissionValue === '' || commissionValue === null || commissionValue === undefined ? '' : number(commissionValue),
    unitStatus: unitStatusFor(brand, store, source),
  };
};
const deriveJuneManagerCommissionRecords = (operationalRecords = [], catalog = DEFAULT_CATALOG, stored = []) => {
  const juneOperationalRecords = (Array.isArray(operationalRecords) ? operationalRecords : [])
    .filter((item) => competenceMonthKey(item) === JUNE_MANAGER_COMMISSION_COMPETENCE && !isJuneManagerExcludedRecord(item));

  const groups = new Map();
  Object.entries(JUNE_MANAGER_COMMISSION_REFERENCE).forEach(([brand, stores]) => {
    Object.entries(stores).forEach(([store, reference]) => {
      groups.set(commissionUnitIdentityKey({ brand, store }), {
        brand,
        store,
        manager: reference.manager,
        passages: 0,
        kits: 0,
      });
    });
  });

  const ensureGroup = (item, manager = '') => {
    const brand = repairMojibake(item?.brand || '');
    const store = repairMojibake(item?.store || '');
    if (!brand || !store || !isJuneManagerUnitIncluded({ brand, store })) return null;
    const key = commissionUnitIdentityKey({ brand, store });
    if (!groups.has(key)) groups.set(key, {
      brand,
      store,
      manager: juneManagerReferenceFor(brand, store)?.manager || repairMojibake(manager || ''),
      passages: 0,
      kits: 0,
    });
    const group = groups.get(key);
    const reference = juneManagerReferenceFor(brand, store);
    group.manager = reference?.manager || group.manager || repairMojibake(manager || '');
    return group;
  };

  (Array.isArray(stored) ? stored : [])
    .map(normalizeCommissionRecord)
    .filter((item) => competenceMonthKey(item) === JUNE_MANAGER_COMMISSION_COMPETENCE
      && !isJuneManagerExcludedRecord(item)
      && !item.consultant
      && !item.consultantName
      && !norm(item.commissionType || item.type).includes('consultor'))
    .forEach((item) => ensureGroup(item, item.managerName || item.manager || catalogManagerFor(catalog, item.brand, item.store)));

  juneOperationalRecords.forEach((item) => {
    const reference = juneManagerReferenceFor(item.brand, item.store);
    const manager = reference?.manager || repairMojibake(item.manager || '') || catalogManagerFor(catalog, item.brand, item.store);
    const group = ensureGroup(item, manager);
    if (!group) return;
    group.manager = reference?.manager || repairMojibake(manager || group.manager || 'Sem gerente');
    group.passages += number(item.passages);
    group.kits += number(item.kits);
  });

  return [...groups.values()]
    .map((group) => {
      const percentage = rate(group.kits, group.passages);
      const reference = juneManagerReferenceFor(group.brand, group.store);
      const manager = group.manager || 'Sem gerente';
      const safeManagerId = norm(manager).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const commissionValue = reference?.commissionValue ?? (isOnTarget(percentage) ? JUNE_MANAGER_COMMISSION_VALUE : 0);
      const eligible = commissionValue > 0;
      return {
        id: `commission-manager-${JUNE_MANAGER_COMMISSION_COMPETENCE}-${norm(group.brand)}-${historicalStoreKey(group.store).replace(/\s+/g, '-')}`,
        competence: JUNE_MANAGER_COMMISSION_COMPETENCE,
        brand: group.brand,
        store: group.store,
        managerId: `manager-${safeManagerId}`,
        managerName: manager,
        manager,
        commissionType: JUNE_MANAGER_COMMISSION_TYPE,
        type: JUNE_MANAGER_COMMISSION_TYPE,
        passages: group.passages,
        kits: group.kits,
        percentage,
        eligible,
        commissionValue,
        commission: commissionValue,
        status: eligible ? 'Elegível' : 'Abaixo da meta',
        paymentDate: '',
        note: 'Comissão de Gerentes de Junho/2026 conforme a referência oficial por Marca + Loja.',
        source: 'Apuração de Gerentes Junho/2026',
        createdAt: '2026-06-01T00:00:00.000Z',
      };
    })
    .sort((a, b) => a.brand.localeCompare(b.brand, 'pt-BR') || a.store.localeCompare(b.store, 'pt-BR'));
};
const deriveJulyManagerCommissionRecords = (operationalRecords = [], catalog = DEFAULT_CATALOG) => {
  const groups = new Map();
  const ensureGroup = (brand, store, manager = '') => {
    const safeBrand = repairMojibake(brand || '');
    const safeStore = repairMojibake(store || '');
    if (!safeBrand || !safeStore) return null;
    const key = commissionUnitIdentityKey({ brand: safeBrand, store: safeStore });
    const resolvedManager = managerForCompetence(catalog, safeBrand, safeStore, JULY_MANAGER_COMMISSION_COMPETENCE)
      || repairMojibake(manager || '')
      || 'Sem gerente';
    if (!groups.has(key)) groups.set(key, {
      brand: safeBrand,
      store: safeStore,
      manager: resolvedManager,
      passages: 0,
      kits: 0,
      hasData: false,
    });
    const group = groups.get(key);
    if ((!group.manager || group.manager === 'Sem gerente') && resolvedManager) group.manager = resolvedManager;
    return group;
  };

  catalog.brands.forEach((brand) => (catalog.stores[brand] || []).forEach((store) => ensureGroup(brand, store)));
  (Array.isArray(operationalRecords) ? operationalRecords : [])
    .filter((item) => competenceMonthKey(item) === JULY_MANAGER_COMMISSION_COMPETENCE)
    .forEach((item) => {
      const group = ensureGroup(item.brand, item.store, item.manager);
      if (!group) return;
      group.hasData = true;
      group.passages += number(item.passages);
      group.kits += number(item.kits);
    });

  return [...groups.values()]
    .map((group) => {
      const percentage = rate(group.kits, group.passages);
      const onTarget = isOnTarget(percentage);
      const pricePerKit = onTarget ? JULY_MANAGER_COMMISSION_TARGET_RATE : JULY_MANAGER_COMMISSION_BELOW_TARGET_RATE;
      const manager = group.manager || 'Sem gerente';
      const safeManagerId = norm(manager).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const unitStatus = unitStatusFor(group.brand, group.store, JULY_MANAGER_COMMISSION_COMPETENCE);
      const isBydDeferred = norm(group.brand) === 'byd';
      const isDiscontinued = unitStatus === UNIT_STATUS_DISCONTINUED;
      const commissionValue = isBydDeferred || isDiscontinued ? 0 : Number((group.kits * pricePerKit).toFixed(2));
      return {
        id: `commission-manager-${JULY_MANAGER_COMMISSION_COMPETENCE}-${norm(group.brand)}-${historicalStoreKey(group.store).replace(/\s+/g, '-')}`,
        competence: JULY_MANAGER_COMMISSION_COMPETENCE,
        brand: group.brand,
        store: group.store,
        managerId: `manager-${safeManagerId}`,
        managerName: manager,
        manager,
        commissionType: JULY_MANAGER_COMMISSION_TYPE,
        type: JULY_MANAGER_COMMISSION_TYPE,
        passages: group.passages,
        kits: group.kits,
        percentage,
        eligible: commissionValue > 0,
        commissionValue,
        commission: commissionValue,
        value: commissionValue,
        status: isDiscontinued ? UNIT_STATUS_DISCONTINUED : isBydDeferred ? 'Aguardando fechamento de Agosto' : group.hasData ? 'Calculada' : 'Sem dados',
        unitStatus,
        paymentDate: '',
        note: isBydDeferred
          ? JULY_BYD_COMMISSION_NOTE
          : group.hasData
          ? `Comissão de Julho/2026: ${group.kits} kits × R$ ${pricePerKit.toFixed(2).replace('.', ',')} (${onTarget ? 'aproveitamento igual ou superior a 40%' : 'aproveitamento abaixo de 40%'}).`
          : 'Sem lançamentos operacionais na competência Julho/2026; comissão calculada em R$ 0,00.',
        source: 'Apuração de Gerentes Julho/2026',
        createdAt: '2026-07-01T00:00:00.000Z',
      };
    })
    .sort((a, b) => a.brand.localeCompare(b.brand, 'pt-BR') || a.store.localeCompare(b.store, 'pt-BR'));
};
const mergeCommissionRecords = (stored = [], operationalRecords = [], catalog = DEFAULT_CATALOG) => {
  const byIdentity = new Map();
  const storedEntries = (Array.isArray(stored) ? stored : []).map((source) => {
    const normalized = normalizeCommissionRecord(source);
    const preserveSource = competenceMonthKey(normalized) === MANAGER_COMMISSION_COMPETENCE;
    return { source, normalized, item: preserveSource ? source : normalized };
  });
  const juneDerived = deriveJuneManagerCommissionRecords(operationalRecords, catalog, stored);
  const juneDerivedUnits = new Set(juneDerived.map(commissionUnitIdentityKey));
  const julyDerived = deriveJulyManagerCommissionRecords(operationalRecords, catalog);
  const julyDerivedKeys = new Set(julyDerived.map((item) => `${competenceMonthKey(item)}|${commissionUnitIdentityKey(item)}`));
  storedEntries.forEach(({ item, normalized }) => {
    const isJuneManager = competenceMonthKey(normalized) === JUNE_MANAGER_COMMISSION_COMPETENCE
      && !normalized.consultant
      && !normalized.consultantName
      && !norm(normalized.commissionType || normalized.type).includes('consultor');
    const isManager = !normalized.consultant
      && !normalized.consultantName
      && !norm(normalized.commissionType || normalized.type).includes('consultor');
    if (isJuneManager && (isJuneManagerExcludedRecord(normalized) || juneDerivedUnits.has(commissionUnitIdentityKey(normalized)))) return;
    if (isManager && julyDerivedKeys.has(`${competenceMonthKey(normalized)}|${commissionUnitIdentityKey(normalized)}`)) return;
    byIdentity.set(commissionIdentityKey(normalized), item);
  });
  FIXED_MANAGER_COMMISSION_SEED.forEach((seed) => {
    const key = commissionIdentityKey(seed);
    if (!byIdentity.has(key)) byIdentity.set(key, seed);
  });
  juneDerived.forEach((derived) => {
    const existingEntry = storedEntries.find(({ normalized }) => commissionUnitIdentityKey(normalized) === commissionUnitIdentityKey(derived)
      && competenceMonthKey(normalized) === JUNE_MANAGER_COMMISSION_COMPETENCE
      && !normalized.consultant
      && !normalized.consultantName
      && !norm(normalized.commissionType || normalized.type).includes('consultor'));
    const existing = existingEntry?.item || {};
    const commissionValue = derived.commissionValue;
    const merged = {
      ...derived,
      ...existing,
      id: existing.id || derived.id,
      competence: derived.competence,
      brand: derived.brand,
      store: derived.store,
      managerId: derived.managerId,
      managerName: derived.managerName,
      manager: derived.manager,
      commissionType: derived.commissionType,
      type: derived.type,
      passages: derived.passages,
      kits: derived.kits,
      percentage: derived.percentage,
      eligible: derived.eligible,
      commissionValue,
      commission: commissionValue,
      value: commissionValue,
      paymentDate: Object.prototype.hasOwnProperty.call(existing, 'paymentDate') ? existing.paymentDate : derived.paymentDate,
      status: existing.status || derived.status,
    };
    byIdentity.set(commissionIdentityKey(merged), merged);
  });
  julyDerived.forEach((derived) => {
    const existingEntry = storedEntries.find(({ normalized }) => {
      const isManager = !normalized.consultant
        && !normalized.consultantName
        && !norm(normalized.commissionType || normalized.type).includes('consultor');
      return isManager
        && competenceMonthKey(normalized) === derived.competence
        && commissionUnitIdentityKey(normalized) === commissionUnitIdentityKey(derived);
    });
    const existing = existingEntry?.item || {};
    const commissionValue = derived.commissionValue;
    const merged = {
      ...derived,
      ...existing,
      id: existing.id || derived.id,
      competence: derived.competence,
      brand: derived.brand,
      store: derived.store,
      managerId: derived.managerId,
      managerName: derived.managerName,
      manager: derived.manager,
      commissionType: derived.commissionType,
      type: derived.type,
      passages: derived.passages,
      kits: derived.kits,
      percentage: derived.percentage,
      eligible: derived.eligible,
      commissionValue,
      commission: commissionValue,
      value: commissionValue,
      unitStatus: derived.unitStatus,
      paymentDate: Object.prototype.hasOwnProperty.call(existing, 'paymentDate') ? existing.paymentDate : derived.paymentDate,
      status: derived.status,
      note: derived.note,
      source: derived.source,
    };
    byIdentity.set(commissionIdentityKey(merged), merged);
  });
  return [...byIdentity.values()].sort((a, b) => `${a.competence}|${a.brand}|${a.store}|${a.managerName}`.localeCompare(`${b.competence}|${b.brand}|${b.store}|${b.managerName}`, 'pt-BR'));
};
const scopeCatalogToStores = (catalog, allowedUnits) => {
  const allowed = new Set((allowedUnits || []).map((unit) => {
    if (typeof unit === 'string' && unit.includes('|')) return unit;
    if (typeof unit === 'string') return accessUnitKey('', unit);
    return unit?.key || accessUnitKey(unit?.brandName || unit?.brand, unit?.storeName || unit?.store);
  }));
  const scoped = cloneCatalog(catalog);
  scoped.stores = Object.fromEntries(Object.entries(scoped.stores).map(([brand, stores]) => [brand, stores.filter((store) => allowed.has(accessUnitKey(brand, store)))]));
  scoped.brands = scoped.brands.filter((brand) => scoped.stores[brand]?.length);
  scoped.managers = Object.fromEntries(Object.entries(scoped.managers).map(([brand, managers]) => [
    brand,
    Object.fromEntries(Object.entries(managers).filter(([store]) => allowed.has(accessUnitKey(brand, store))))
  ]));
  scoped.consultants = Object.fromEntries(Object.entries(scoped.consultants).map(([brand, stores]) => [
    brand,
    Object.fromEntries(Object.entries(stores).filter(([store]) => allowed.has(accessUnitKey(brand, store))))
  ]));
  return scoped;
};
const sumPassages = (rows) => rows.reduce((total, item) => total + number(item.passages), 0);
const unitKey = (item) => `${item.brand || 'Sem marca'}|${item.store || 'Sem loja'}|${item.manager || 'Sem gerente'}`;
const aggregateUnits = (rows) => {
  const groups = new Map();
  rows.forEach((item) => {
    const key = unitKey(item);
    if (!groups.has(key)) groups.set(key, { key, brand: item.brand || 'Sem marca', store: item.store || 'Sem loja', manager: item.manager || 'Sem gerente', records: [] });
    groups.get(key).records.push(item);
  });
  return [...groups.values()].map((group) => {
    const passages = sumPassages(group.records);
    const kits = sumKits(group.records);
    return { ...group, passages, kits, percentage: rate(kits, passages), hasData: group.records.length > 0 };
  }).sort((a, b) => b.percentage - a.percentage || b.kits - a.kits || a.store.localeCompare(b.store));
};
const totalsForRows = (rows) => {
  const units = aggregateUnits(rows);
  const passages = units.reduce((total, unit) => total + unit.passages, 0);
  const kits = sumKits(rows);
  return { passages, kits, percentage: rate(kits, passages) };
};
const aggregateConsultants = (rows) => {
  const groups = new Map();
  rows.forEach((item) => {
    const name = String(item.consultant || '').trim();
    if (!name) return;
    const key = norm(name);
    if (!groups.has(key)) groups.set(key, { consultant: name, records: [] });
    groups.get(key).records.push(item);
  });
  return [...groups.values()].map((group) => {
    const passages = sumPassages(group.records);
    const kits = sumKits(group.records);
    return { ...group, passages, kits, percentage: rate(kits, passages), hasData: group.records.length > 0 };
  }).sort((a, b) => b.percentage - a.percentage || b.kits - a.kits || a.consultant.localeCompare(b.consultant));
};
const rankingDateKey = (item) => {
  const raw = item?.date || item?.importDate || item?.importedAt;
  if (!raw) return '';
  const text = String(raw).trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (br) return `${br[3].length === 2 ? `20${br[3]}` : br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};
const rankingMonthKey = (item) => rankingDateKey(item).slice(0, 7);
const buildGlobalUnitRanking = (rows, catalog, month = 'all') => {
  const scopedRows = month === 'all' ? rows : rows.filter((item) => rankingMonthKey(item) === month);
  const groups = new Map();
  const ensure = (brand, store, manager = '') => {
    const key = unitIdentityKey({ brand, store });
    if (!groups.has(key)) groups.set(key, {
      key,
      brand,
      store,
      manager: manager || 'Sem gerente',
      unitStatus: unitStatusFor(brand, store, month === 'all' ? undefined : month),
      records: [],
    });
    const group = groups.get(key);
    if ((!group.manager || group.manager === 'Sem gerente') && manager) group.manager = manager;
    return group;
  };
  catalog.brands.forEach((brand) => (catalog.stores[brand] || []).forEach((store) => ensure(brand, store, managerForCompetence(catalog, brand, store, month === 'all' ? undefined : month))));
  aggregateUnits(scopedRows).forEach((unit) => {
    const group = ensure(unit.brand, unit.store, unit.manager);
    group.records.push(...unit.records);
  });
  return [...groups.values()].map((group) => {
    const passages = sumPassages(group.records);
    const kits = sumKits(group.records);
    return { ...group, passages, kits, percentage: rate(kits, passages), hasData: group.records.length > 0 };
  }).sort((a, b) => b.percentage - a.percentage || b.kits - a.kits || `${a.brand} ${a.store}`.localeCompare(`${b.brand} ${b.store}`));
};
const buildGlobalConsultantRanking = (rows, catalog) => {
  const groups = new Map();
  const ensure = (name) => {
    const key = norm(name);
    if (!groups.has(key)) groups.set(key, { consultant: name, records: [], units: new Set() });
    return groups.get(key);
  };
  catalog.brands.forEach((brand) => Object.entries(catalog.consultants[brand] || {}).forEach(([store, consultants]) => consultants.forEach((consultant) => {
    const group = ensure(consultant);
    group.units.add(`${brand} • ${store}`);
  })));
  aggregateConsultants(rows).forEach((consultant) => {
    const group = ensure(consultant.consultant);
    group.records.push(...consultant.records);
    consultant.records.forEach((item) => group.units.add(`${item.brand || 'Sem marca'} • ${item.store || 'Sem loja'}`));
  });
  return [...groups.values()].map((group) => {
    const passages = sumPassages(group.records);
    const kits = sumKits(group.records);
    return { ...group, units: [...group.units], passages, kits, percentage: rate(kits, passages), hasData: group.records.length > 0 };
  }).sort((a, b) => b.percentage - a.percentage || b.kits - a.kits || a.consultant.localeCompare(b.consultant));
};
const ALL_STORES = [...new Set(Object.values(BRAND_STORES).flat())].sort();
const ALL_MANAGERS = [...new Set(Object.values(BRAND_MANAGERS).flatMap((stores) => Object.values(stores)))].sort();
const ALL_CONSULTANTS = [...new Set(Object.values(CONSULTANTS).flatMap((stores) => Object.values(stores).flat()))].sort();
const displayDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
};
const displayDateTime = (value, fallback) => {
  const raw = value || fallback;
  if (!raw) return '—';
  if (!value && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return displayDate(raw);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? displayDate(raw) : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};
const toDate = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (br) return `${br[3].length === 2 ? `20${br[3]}` : br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

async function loadRecords() {
  if (window.sensesCar) return window.sensesCar.load();
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
async function saveRecords(records) {
  if (window.sensesCar) return window.sensesCar.save(records);
  localStorage.setItem(KEY, JSON.stringify(records));
}
async function loadCommissions() {
  if (window.sensesCar?.loadCommissions) return window.sensesCar.loadCommissions();
  try { return JSON.parse(localStorage.getItem(COMMISSIONS_KEY) || '[]'); } catch { return []; }
}
async function saveCommissions(commissions) {
  if (window.sensesCar?.saveCommissions) return window.sensesCar.saveCommissions(commissions);
  localStorage.setItem(COMMISSIONS_KEY, JSON.stringify(commissions));
}
async function loadCatalog() {
  if (window.sensesCar?.loadCatalog) return window.sensesCar.loadCatalog();
  try { return JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null'); } catch { return null; }
}
async function saveCatalog(catalog) {
  if (window.sensesCar?.saveCatalog) return window.sensesCar.saveCatalog(catalog);
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
}
async function loadRemoteCatalog() {
  const [brandsResult, storesResult] = await Promise.all([
    supabase.from('brands').select('id, name, is_active, created_at, updated_at').order('name', { ascending: true }),
    supabase.from('stores').select('id, brand_id, name, is_active, created_at, updated_at').order('name', { ascending: true }),
  ]);
  const error = brandsResult.error || storesResult.error;
  if (error) throw error;
  return { brands: brandsResult.data || [], stores: storesResult.data || [] };
}
const catalogFromRemote = (localCatalog, remoteCatalog) => {
  const local = normalizeCatalog(localCatalog);
  const activeBrands = (remoteCatalog?.brands || []).filter((brand) => brand.is_active !== false);
  const activeBrandNames = activeBrands.map((brand) => brand.name);
  const stores = Object.fromEntries(activeBrands.map((brand) => [
    brand.name,
    (remoteCatalog?.stores || [])
      .filter((store) => store.brand_id === brand.id && store.is_active !== false)
      .map((store) => store.name),
  ]));
  return normalizeCatalog({
    brands: activeBrandNames,
    stores,
    managers: local.managers,
    consultants: local.consultants,
  });
};

function BrandLogo({ brand, compact = false }) {
  if (!brand) return null;
  const logo = BRAND_LOGOS[brand];
  const initials = String(brand).split(/\s+/).map((part) => part[0]).join('').slice(0, 4).toUpperCase();
  return <div className={`brand-logo brand-${brand.toLowerCase()} ${compact ? 'compact' : ''}`} aria-label={`Logo ${brand}`}>
    {logo ? <img src={logo} alt={`Logo ${brand}`} draggable="false" loading="eager" /> : <strong className="brand-text-logo">{initials}</strong>}
  </div>;
}

function BrandCards({ value = '', onChange, includeAll = false, className = '', brands = Object.keys(BRAND_LOGOS) }) {
  return <div className={`brand-filter-grid ${className}`.trim()}>
    {includeAll && <button type="button" className={`brand-filter-card brand-filter-all-card ${!value ? 'selected' : ''}`} onClick={() => onChange('')} aria-label="Todas as marcas" aria-pressed={!value} title="Todas as marcas"><span className="brand-filter-all"><Sparkles size={18}/></span>{!value && <Check className="brand-filter-check" size={15}/>}<span className="visually-hidden">Todas as marcas</span></button>}
    {brands.map((brand) => <button type="button" key={brand} className={`brand-filter-card ${value === brand ? 'selected' : ''}`} onClick={() => onChange(brand)} aria-label={`Marca ${brand}`} aria-pressed={value === brand} title={brand}><BrandLogo brand={brand}/>{value === brand && <Check className="brand-filter-check" size={15}/>}<span className="visually-hidden">{brand}</span></button>)}
  </div>;
}

function SensesLogo({ variant = 'white', className = '', alt = 'Senses Car' }) {
  const source = variant === 'black' ? sensesCarLogoBlack : sensesCarLogoWhite;
  return <img className={`senses-car-logo ${className}`.trim()} src={source} alt={alt} draggable="false" />;
}

function UpdateCenter({ state = {}, onCheck, onDownload, onInstall }) {
  const status = state.status || 'idle';
  const progress = Math.max(0, Math.min(100, Number(state.percent) || 0));
  const isBusy = ['checking', 'downloading', 'installing'].includes(status);
  const isDev = status === 'dev';
  const action = status === 'downloaded' ? onInstall : status === 'available' ? onDownload : onCheck;
  const Icon = status === 'downloaded' ? RefreshCw : status === 'available' ? Download : RefreshCw;
  const label = status === 'downloaded'
    ? 'Reiniciar e atualizar'
    : status === 'available'
      ? 'Baixar atualização'
      : status === 'checking'
        ? 'Verificando...'
        : status === 'downloading'
          ? `Baixando ${progress}%`
          : status === 'installing'
            ? 'Instalando...'
            : 'Buscar atualizações';
  const detail = status === 'dev'
    ? 'Disponível no aplicativo empacotado'
    : status === 'not-available'
      ? 'Você já está usando a versão mais recente'
      : status === 'available'
        ? `Nova versão ${state.availableVersion || ''} encontrada`
        : status === 'downloading'
          ? 'O download continuará automaticamente em segundo plano'
          : status === 'downloaded'
            ? `Versão ${state.availableVersion || 'nova'} pronta para instalar`
            : status === 'error'
              ? 'Não foi possível verificar agora. Tente novamente.'
              : 'Atualizações automáticas do aplicativo';
  return <div className="update-center">
    <button type="button" className={`button ${status === 'downloaded' ? 'primary' : 'secondary'} update-button`} onClick={action} disabled={isBusy || isDev} title={isDev ? 'Disponível somente no aplicativo empacotado' : detail}>
      <Icon size={16} className={isBusy ? 'update-icon-spin' : ''}/>{label}
    </button>
    <span className={`update-status update-status--${status}`} role="status">{detail}</span>
  </div>;
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></header>
      {children}
    </section>
  </div>;
}

function StatusBadge({ percentage, compact = false, hasData = true, unitStatus = UNIT_STATUS_ACTIVE }) {
  if (unitStatus === UNIT_STATUS_DISCONTINUED) return <span className={`status-badge unit-status-discontinued ${compact ? 'compact' : ''}`}>{UNIT_STATUS_DISCONTINUED.toUpperCase()}</span>;
  if (!hasData) return <span className={`status-badge no-data ${compact ? 'compact' : ''}`}>SEM DADOS</span>;
  const target = isOnTarget(percentage);
  return <span className={`status-badge ${target ? 'on-target' : 'below-target'} ${compact ? 'compact' : ''}`}>{target ? '✓ DENTRO DA META' : '↓ ABAIXO DA META'}</span>;
}

function UnitStatusBadge({ status = UNIT_STATUS_ACTIVE, compact = false }) {
  const discontinued = status === UNIT_STATUS_DISCONTINUED;
  return <span className={`status-badge unit-status-badge ${discontinued ? 'unit-status-discontinued' : 'unit-status-active'} ${compact ? 'compact' : ''}`}>{status.toUpperCase()}</span>;
}

function FilterPanel({ filters, setFilters, options, report = false, onClear, compact = false, overview = false, period = 'all', setPeriod, search = '', setSearch }) {
  const update = (key, value) => setFilters((current) => {
    const next = { ...current, [key]: value };
    if (key === 'brand') Object.assign(next, { store: '', manager: '', consultant: '' });
    if (key === 'store') Object.assign(next, { manager: '', consultant: '' });
    return next;
  });
  const applied = [];
  if (overview && period && period !== 'all') applied.push({ key: 'period', label: period === 'month' ? 'Este mês' : 'Últimos 30 dias' });
  if (overview && search) applied.push({ key: 'search', label: `Busca: ${search}` });
  if (!overview && filters.from) applied.push({ key: 'from', label: `De ${displayDate(filters.from)}` });
  if (!overview && filters.to) applied.push({ key: 'to', label: `Até ${displayDate(filters.to)}` });
  if (filters.brand) applied.push({ key: 'brand', label: filters.brand });
  if (filters.store) applied.push({ key: 'store', label: filters.store });
  if (filters.manager) applied.push({ key: 'manager', label: filters.manager });
  if (filters.consultant) applied.push({ key: 'consultant', label: filters.consultant });
  if (report && filters.status) applied.push({ key: 'status', label: filters.status === 'on-target' ? 'Dentro da meta' : 'Abaixo da meta' });
  const remove = (key) => {
    if (key === 'period') return setPeriod?.('all');
    if (key === 'search') return setSearch?.('');
    update(key, '');
  };
  return <section className={`filter-panel ${compact ? 'filter-panel-compact' : ''}`}>
    <div className="filter-panel-heading"><div><span className="filter-kicker"><Filter size={14}/> FILTROS EXECUTIVOS</span><strong>Refine a visão por período, unidade e responsável.</strong></div><button type="button" className="filter-clear" onClick={onClear}><X size={14}/> Limpar filtros</button></div>
    <div className="filter-brand-block"><div className="filter-section-label"><span>Marca</span><small>Selecione uma identidade para filtrar os resultados</small></div><BrandCards brands={options.brands} value={filters.brand} onChange={(value) => update('brand', value)} includeAll /></div>
    <div className="filter-grid">
      {overview ? <label className="filter-field"><span><CalendarRange size={14}/> Período</span><select value={period} onChange={(e) => setPeriod?.(e.target.value)}><option value="all">Todos os períodos</option><option value="month">Este mês</option><option value="30">Últimos 30 dias</option></select><ChevronDown size={14}/></label> : <><label className="filter-field"><span><CalendarRange size={14}/> De</span><input type="date" value={filters.from} onChange={(e) => update('from', e.target.value)} /></label><label className="filter-field"><span><CalendarRange size={14}/> Até</span><input type="date" value={filters.to} onChange={(e) => update('to', e.target.value)} /></label></>}
      {overview && <label className="filter-field filter-search-field"><span><Search size={14}/> Buscar</span><input value={search} onChange={(e) => setSearch?.(e.target.value)} placeholder="Marca, loja ou consultor" /></label>}
      <label className="filter-field"><span>Loja</span><select value={filters.store} onChange={(e) => update('store', e.target.value)}><option value="">Todas as lojas</option>{options.stores.map((store) => <option key={store} value={store}>{store}</option>)}</select><ChevronDown size={14}/></label>
      <label className="filter-field"><span>Gerente</span><select value={filters.manager} onChange={(e) => update('manager', e.target.value)}><option value="">Todos os gerentes</option>{options.managers.map((manager) => <option key={manager} value={manager}>{manager}</option>)}</select><ChevronDown size={14}/></label>
      <label className="filter-field"><span>Consultor</span><select value={filters.consultant} onChange={(e) => update('consultant', e.target.value)}><option value="">Todos os consultores</option>{options.consultants.map((consultant) => <option key={consultant} value={consultant}>{consultant}</option>)}</select><ChevronDown size={14}/></label>
      {report && <label className="filter-field"><span>Situação da meta</span><select value={filters.status} onChange={(e) => update('status', e.target.value)}><option value="">Todas as situações</option><option value="on-target">Dentro da meta • ≥ 40%</option><option value="below-target">Abaixo da meta • &lt; 40%</option></select><ChevronDown size={14}/></label>}
    </div>
    <div className="applied-filters"><div><span>Filtros aplicados</span>{applied.length ? applied.map((item) => <button type="button" className="filter-chip" key={item.key} onClick={() => remove(item.key)}>{item.label}<X size={12}/></button>) : <em>Nenhum filtro aplicado · visão consolidada</em>}</div>{applied.length > 1 && <button type="button" className="filter-clear filter-clear-inline" onClick={onClear}>Limpar todos</button>}</div>
  </section>;
}

function ReportsPanel({ rows, filters, setFilters, options, summary, onBack, onExportXlsx, onExportPdf, onDeleteRecord }) {
  return <section className="executive-view report-view page-report">
    <div className="page-banner"><div><span>RELATÓRIOS • SENSES CAR</span><strong>Dados limpos para decisões precisas.</strong></div></div>
    <div className="executive-head"><div><button className="back-link" onClick={onBack}>← Visão Geral</button><span className="kicker">CENTRAL EXECUTIVA</span><h2>Relatórios</h2><p>Extraia a mesma base filtrada usada no acompanhamento da campanha.</p></div><div className="executive-actions"><button className="button secondary" onClick={onExportPdf} disabled={!rows.length}><FileDown size={17}/> Exportar PDF</button><button className="button primary" onClick={onExportXlsx} disabled={!rows.length}><FileSpreadsheet size={17}/> Exportar Excel</button></div></div>
    <FilterPanel filters={filters} setFilters={setFilters} options={options} report onClear={() => setFilters({ ...EMPTY_REPORT_FILTERS })} />
    <div className="report-meta"><span><FileText size={15}/> {rows.length.toLocaleString('pt-BR')} registros no relatório</span><span>Meta oficial: <strong>40%</strong></span>{filters.brand && <BrandLogo brand={filters.brand} compact />}</div>
    <div className="report-summary"><div><span>Passagens consolidadas</span><strong>{summary.passages.toLocaleString('pt-BR')}</strong></div><div><span>Kits vendidos</span><strong>{summary.kits.toLocaleString('pt-BR')}</strong></div><div><span>Aproveitamento geral</span><strong>{roundedPercent(summary.kits, summary.passages)}</strong></div><div><span>Meta</span><strong className={isOnTarget(summary.percentage) ? 'target-value' : 'below-value'}>{isOnTarget(summary.percentage) ? 'DENTRO' : 'ABAIXO'}</strong></div></div>
    {rows.length ? <div className="table-wrap report-table-wrap"><table className="report-table"><thead><tr><th>Data da Importação</th><th>Marca</th><th>Loja</th><th>Status da Unidade</th><th>Gerente</th><th>Consultor</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">% Aproveitamento</th>{onDeleteRecord && <th aria-label="Ações" />}</tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{displayDateTime(item.importedAt, item.importDate || item.date)}</td><td>{item.brand ? <BrandLogo brand={item.brand} compact /> : '—'}</td><td>{item.store || '—'}</td><td><UnitStatusBadge status={item.unitStatus || unitStatusFor(item.brand, item.store, item)} compact/></td><td>{item.manager || '—'}</td><td className="consultant-cell">{item.consultant || '—'}</td><td className="numeric">{number(item.passages).toLocaleString('pt-BR')}</td><td className="numeric">{number(item.kits).toLocaleString('pt-BR')}</td><td className={`numeric ${isOnTarget(rate(item.kits, item.passages)) ? 'target-text' : 'below-text'}`}>{roundedPercent(item.kits, item.passages)}</td>{onDeleteRecord && <td className="row-action"><button type="button" className="delete" onClick={() => onDeleteRecord(item)} aria-label={`Excluir lançamento de ${item.brand || 'marca não informada'} ${item.store || ''}`} title="Excluir lançamento"><Trash2 size={16}/></button></td>}</tr>)}</tbody></table></div> : <div className="executive-empty"><FileText size={28}/><h3>Nenhum registro para os filtros selecionados</h3><p>Altere o período ou limpe os filtros para gerar o relatório.</p></div>}
  </section>;
}

function LegacyDashboardPanel({ rows, units, totals, filters, setFilters, options, selectedUnit, onSelectUnit, onBack }) {
  /* Legacy implementation kept temporarily during dashboard refactor. */
  return null;
  /*
  const consultants = selectedUnit ? aggregateConsultants(selectedUnit.records) : [];
  const brandTotals = Object.entries(units.reduce((acc, unit) => { acc[unit.brand] ||= { kits: 0, passages: 0 }; acc[unit.brand].kits += unit.kits; acc[unit.brand].passages += unit.passages; return acc; }, {})).sort((a, b) => b[1].kits - a[1].kits);
  const targetUnits = units.filter((unit) => isOnTarget(unit.percentage)).length;
  const maxBrandKits = Math.max(...brandTotals.map(([, data]) => data.kits), 1);
  return <section className="executive-view dashboard-view page-dashboard">
    <div className="page-banner"><div><span>DASHBOARD BI • PERFORMANCE</span><strong>Precisão, ritmo e resultado em uma única visão.</strong></div></div>
    <div className="executive-head"><div><button className="back-link" onClick={onBack}>← Visão Geral</button><span className="kicker">PAINEL BI • CAMPANHA</span><h2>Dashboard Executivo</h2><p>Ranking de unidades atualizado automaticamente pela meta oficial de 40%.</p></div><div className="bi-goal"><Target size={24}/><span>Meta de aproveitamento<strong>40%</strong></span></div></div>
    <FilterPanel filters={filters} setFilters={setFilters} options={options} onClear={() => setFilters({ ...EMPTY_FILTERS })} />
    <div className="bi-context"><span><Gauge size={15}/> {rows.length.toLocaleString('pt-BR')} lançamentos na visão</span>{filters.brand && <BrandLogo brand={filters.brand} compact />}<span className="context-note">Passagens consolidadas pela soma de todos os lancamentos filtrados.</span></div>
    <div className="bi-kpis"><article className="bi-kpi navy"><span>Total de Passagens</span><strong>{totals.passages.toLocaleString('pt-BR')}</strong><small>Consolidado das unidades filtradas</small></article><article className="bi-kpi beige"><span>Total de Kits Vendidos</span><strong>{totals.kits.toLocaleString('pt-BR')}</strong><small>Somatório da produção registrada</small></article><article className={`bi-kpi ${isOnTarget(totals.percentage) ? 'green' : 'terra'}`}><span>Aproveitamento Geral</span><strong>{roundedPercent(totals.kits, totals.passages)}</strong><small>{isOnTarget(totals.percentage) ? 'Dentro da meta' : 'Abaixo da meta'}</small></article><article className="bi-kpi split"><div><span>Lojas dentro da meta</span><strong className="target-text">{targetUnits}</strong></div><div><span>Lojas abaixo da meta</span><strong className="below-text">{units.length - targetUnits}</strong></div></article></div>
    <div className="bi-layout"><article className="ranking-card"><div className="panel-title"><div><span>PERFORMANCE POR UNIDADE</span><h3>Ranking de Unidades</h3></div><Medal size={21}/></div>{units.length ? <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>Ranking</th><th>Marca</th><th>Loja</th><th>Gerente</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">Aproveitamento</th><th>Situação</th></tr></thead><tbody>{units.map((unit, index) => <tr key={unit.key} className={`${selectedUnit?.key === unit.key ? 'selected' : ''} ${isOnTarget(unit.percentage) ? 'target-row' : 'below-row'}`} onClick={() => onSelectUnit(unit)} onKeyDown={(e) => e.key === 'Enter' && onSelectUnit(unit)} tabIndex="0"><td><span className={`rank-number rank-${index + 1}`}>{index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</span></td><td><BrandLogo brand={unit.brand} compact /></td><td><strong>{unit.store}</strong><small>Clique para detalhar consultores</small></td><td>{unit.manager}</td><td className="numeric amount">{unit.passages.toLocaleString('pt-BR')}</td><td className="numeric amount">{unit.kits.toLocaleString('pt-BR')}</td><td className={`numeric amount ${isOnTarget(unit.percentage) ? 'target-text' : 'below-text'}`}>{roundedPercent(unit.kits, unit.passages)}</td><td><StatusBadge percentage={unit.percentage} compact unitStatus={unit.unitStatus} /></td></tr>)}</tbody></table></div> : <div className="executive-empty compact-empty"><Medal size={27}/><h3>Nenhuma unidade encontrada</h3><p>Registre ou importe dados para gerar o ranking.</p></div>}</article><div className="bi-side"><article className="chart-card bi-chart"><div className="panel-title"><div><span>VISÃO POR MARCA</span><h3>Kits vendidos</h3></div><BarChart3 size={19}/></div>{brandTotals.length ? <div className="bars">{brandTotals.map(([brand, data]) => <div className="bar-row" key={brand}><div className="bar-brand-label"><BrandLogo brand={brand} compact /><b>{data.kits.toLocaleString('pt-BR')} kits</b></div><div className={`bar-track ${isOnTarget(rate(data.kits, data.passages)) ? 'target-bar' : 'below-bar'}`}><i style={{ width: `${Math.max(6, (data.kits / maxBrandKits) * 100)}%` }} /></div><small className={isOnTarget(rate(data.kits, data.passages)) ? 'target-text' : 'below-text'}>{roundedPercent(data.kits, data.passages)} de aproveitamento • {data.passages.toLocaleString('pt-BR')} passagens</small></div>)}</div> : <p className="chart-empty">Sem dados para o período.</p>}</article><article className="goal-card"><Target size={23}/><div><span>REGRA AUTOMÁTICA</span><h3>Meta de 40%</h3><p>Verde para resultados iguais ou superiores à meta. Vermelho para resultados abaixo dela.</p></div></article></div></div>
    {selectedUnit && <article className="detail-card"><div className="panel-title"><div><span>DETALHAMENTO DA UNIDADE</span><h3>{selectedUnit.brand} • {selectedUnit.store}</h3><p>{selectedUnit.manager} • {roundedPercent(selectedUnit.kits, selectedUnit.passages)} de aproveitamento</p></div><button className="icon-button" onClick={() => onSelectUnit(null)} aria-label="Fechar detalhamento"><X size={18}/></button></div><div className="detail-meta"><BrandLogo brand={selectedUnit.brand} compact /><span>{selectedUnit.passages.toLocaleString('pt-BR')} passagens</span><span>{selectedUnit.kits.toLocaleString('pt-BR')} kits</span><StatusBadge percentage={selectedUnit.percentage} unitStatus={selectedUnit.unitStatus}/></div><div className="table-wrap"><table className="consultant-table"><thead><tr><th>Consultor</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">Aproveitamento</th><th>Situação</th></tr></thead><tbody>{consultants.map((item) => <tr key={item.consultant}><td><UsersRound size={15}/>{item.consultant}</td><td className="numeric">{item.passages.toLocaleString('pt-BR')}</td><td className="numeric">{item.kits.toLocaleString('pt-BR')}</td><td className={`numeric ${isOnTarget(item.percentage) ? 'target-text' : 'below-text'}`}>{roundedPercent(item.kits, item.passages)}</td><td><StatusBadge percentage={item.percentage} compact /></td></tr>)}</tbody></table></div></article>}
  </section>;
  */
}

function RankingPanel({ records, catalog, onBack }) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const monthOptions = useMemo(() => [...new Set([DISCONTINUED_UNIT_EFFECTIVE_MONTH, ...records.map(rankingMonthKey)].filter((month) => /^\d{4}-\d{2}$/.test(month)))].sort((a, b) => b.localeCompare(a)), [records]);
  const rankingUnits = useMemo(() => buildGlobalUnitRanking(records, catalog, selectedMonth), [records, catalog, selectedMonth]);
  const monthLabel = (value) => {
    if (value === 'all') return 'Todos os meses';
    const date = new Date(`${value}-01T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date).replace(/^./, (letter) => letter.toUpperCase());
  };
  const unitsWithData = rankingUnits.filter((unit) => unit.hasData).length;
  const consultantPlaces = ['🥇', '🥈', '🥉'];

  useEffect(() => {
    if (selectedMonth !== 'all' && !monthOptions.includes(selectedMonth)) setSelectedMonth('all');
  }, [monthOptions, selectedMonth]);

  return <section className="executive-view ranking-view page-ranking">
    <div className="page-banner"><div><span>RANKING • PERFORMANCE POR UNIDADE</span><strong>Resultado geral com leitura simples por mês.</strong></div><Medal size={24}/></div>
    <div className="executive-head"><div><button className="back-link" onClick={onBack}>← Visão Geral</button><span className="kicker">PAINEL DE PERFORMANCE</span><h2>Ranking Geral</h2><p>Compare todas as unidades cadastradas e filtre o histórico por mês.</p></div><div className="ranking-period-total"><Medal size={21}/><span>Unidades no ranking<strong>{rankingUnits.length}</strong></span></div></div>
    <div className="ranking-toolbar"><label className="filter-field"><span><CalendarRange size={14}/> Mês de referência</span><select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}><option value="all">Todos os meses</option>{monthOptions.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select><ChevronDown size={14}/></label><div className="ranking-toolbar-note"><span>PERÍODO SELECIONADO</span><strong>{monthLabel(selectedMonth)}</strong><small>{unitsWithData} {unitsWithData === 1 ? 'unidade com lançamentos' : 'unidades com lançamentos'}</small></div></div>
    <article className="ranking-card ranking-page-card"><div className="panel-title"><div><span>PERFORMANCE POR UNIDADE</span><h3>Ranking de Unidades</h3><p>{selectedMonth === 'all' ? 'Ranking global com todo o histórico cadastrado.' : `Ranking consolidado de ${monthLabel(selectedMonth)}.`}</p></div><Medal size={21}/></div>{rankingUnits.length ? <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>Ranking</th><th>Marca</th><th>Loja</th><th>Gerente</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">Aproveitamento</th><th>Situação</th></tr></thead><tbody>{rankingUnits.map((unit, index) => <tr key={unit.key} className={isOnTarget(unit.percentage) ? 'target-row' : 'below-row'}><td><span className={`rank-number rank-${index + 1}`}>{index < 3 ? consultantPlaces[index] : index + 1}</span></td><td><BrandLogo brand={unit.brand} compact /></td><td><strong>{unit.store}</strong><small>Desempenho consolidado da unidade</small></td><td>{unit.manager}</td><td className="numeric amount">{unit.passages.toLocaleString('pt-BR')}</td><td className="numeric amount">{unit.kits.toLocaleString('pt-BR')}</td><td className={`numeric amount ${isOnTarget(unit.percentage) ? 'target-text' : 'below-text'}`}>{roundedPercent(unit.kits, unit.passages)}</td><td><StatusBadge percentage={unit.percentage} compact hasData={unit.hasData} unitStatus={unit.unitStatus}/></td></tr>)}</tbody></table></div> : <div className="executive-empty compact-empty"><Medal size={27}/><h3>Nenhuma unidade encontrada</h3><p>Cadastre uma unidade para gerar o ranking.</p></div>}</article>
  </section>;
}

function DashboardPanel({ rows, units, rankingUnits, rankingConsultants, totals, filters, setFilters, options, selectedUnit, onSelectUnit, onBack, showRanking = true }) {
  const consultants = selectedUnit ? aggregateConsultants(selectedUnit.records) : [];
  const brandTotals = Object.entries(units.reduce((acc, unit) => {
    acc[unit.brand] ||= { kits: 0, passages: 0 };
    acc[unit.brand].kits += unit.kits;
    acc[unit.brand].passages += unit.passages;
    return acc;
  }, {})).sort((a, b) => b[1].kits - a[1].kits || a[0].localeCompare(b[0]));
  const targetUnits = units.filter((unit) => isOnTarget(unit.percentage)).length;
  const maxBrandKits = Math.max(...brandTotals.map(([, data]) => data.kits), 1);
  const bestConsultants = rankingConsultants.slice(0, 3);
  const improvementConsultants = [...rankingConsultants].sort((a, b) => a.percentage - b.percentage || a.kits - b.kits || a.consultant.localeCompare(b.consultant)).slice(0, 3);
  const consultantPlaces = ['🥇', '🥈', '🥉'];
  const consultantUnitLabel = (item) => item.hasData
    ? `${item.units.slice(0, 2).join(' / ')}${item.units.length > 2 ? '...' : ''}`
    : 'Sem lancamentos';
  const renderConsultantRanking = (items, variant) => items.length ? items.map((item, index) => <div className="consultant-rank-item" key={`${variant}-${item.consultant}`}>
    <span className={`consultant-rank-position rank-${index + 1}`}>{consultantPlaces[index] || index + 1}</span>
    <div className="consultant-rank-person"><strong>{item.consultant}</strong><small>{consultantUnitLabel(item)}</small></div>
    <b className={isOnTarget(item.percentage) ? 'target-text' : 'below-text'}>{roundedPercent(item.kits, item.passages)}</b>
  </div>) : <p className="chart-empty">Nenhum consultor cadastrado.</p>;

  return <section className="executive-view dashboard-view page-dashboard">
    <div className="page-banner"><div><span>DASHBOARD BI - PERFORMANCE</span><strong>Precisao, ritmo e resultado em uma unica visao.</strong></div></div>
    <div className="executive-head"><div><button className="back-link" onClick={onBack}>← Visao Geral</button><span className="kicker">PAINEL BI - CAMPANHA</span><h2>Dashboard Executivo</h2><p>Ranking de unidades atualizado automaticamente pela meta oficial de 40%.</p></div><div className="bi-goal"><Target size={24}/><span>Meta de aproveitamento<strong>40%</strong></span></div></div>
    <FilterPanel filters={filters} setFilters={setFilters} options={options} onClear={() => setFilters({ ...EMPTY_FILTERS })} />
    <div className="bi-context"><span><Gauge size={15}/> {rows.length.toLocaleString('pt-BR')} lancamentos na visao</span>{filters.brand && <BrandLogo brand={filters.brand} compact />}<span className="context-note">Passagens consolidadas pela soma de todos os lancamentos filtrados.</span></div>
    <div className="bi-kpis"><article className="bi-kpi navy"><span>Total de Passagens</span><strong>{totals.passages.toLocaleString('pt-BR')}</strong><small>Consolidado das unidades filtradas</small></article><article className="bi-kpi beige"><span>Total de Kits Vendidos</span><strong>{totals.kits.toLocaleString('pt-BR')}</strong><small>Somatorio da producao registrada</small></article><article className={`bi-kpi ${isOnTarget(totals.percentage) ? 'green' : 'terra'}`}><span>Aproveitamento Geral</span><strong>{roundedPercent(totals.kits, totals.passages)}</strong><small>{isOnTarget(totals.percentage) ? 'Dentro da meta' : 'Abaixo da meta'}</small></article><article className="bi-kpi split"><div><span>Lojas dentro da meta</span><strong className="target-text">{targetUnits}</strong></div><div><span>Lojas abaixo da meta</span><strong className="below-text">{units.length - targetUnits}</strong></div></article></div>
    <div className={`bi-layout ${showRanking ? '' : 'bi-layout-no-ranking'}`}>{showRanking && <article className="ranking-card"><div className="panel-title"><div><span>PERFORMANCE POR UNIDADE</span><h3>Ranking de Unidades</h3><p>Ranking global - todas as unidades cadastradas e historicas.</p></div><Medal size={21}/></div>{rankingUnits.length ? <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>Ranking</th><th>Marca</th><th>Loja</th><th>Gerente</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">Aproveitamento</th><th>Situacao</th></tr></thead><tbody>{rankingUnits.map((unit, index) => <tr key={unit.key} className={`${selectedUnit?.key === unit.key ? 'selected' : ''} ${isOnTarget(unit.percentage) ? 'target-row' : 'below-row'}`} onClick={() => onSelectUnit(unit)} onKeyDown={(e) => e.key === 'Enter' && onSelectUnit(unit)} tabIndex="0"><td><span className={`rank-number rank-${index + 1}`}>{index < 3 ? consultantPlaces[index] : index + 1}</span></td><td><BrandLogo brand={unit.brand} compact /></td><td><strong>{unit.store}</strong><small>Clique para detalhar consultores</small></td><td>{unit.manager}</td><td className="numeric amount">{unit.passages.toLocaleString('pt-BR')}</td><td className="numeric amount">{unit.kits.toLocaleString('pt-BR')}</td><td className={`numeric amount ${isOnTarget(unit.percentage) ? 'target-text' : 'below-text'}`}>{roundedPercent(unit.kits, unit.passages)}</td><td><StatusBadge percentage={unit.percentage} compact hasData={unit.hasData} unitStatus={unit.unitStatus} /></td></tr>)}</tbody></table></div> : <div className="executive-empty compact-empty"><Medal size={27}/><h3>Nenhuma unidade encontrada</h3><p>Cadastre uma unidade ou importe dados para gerar o ranking.</p></div>}</article>}<div className="bi-side"><article className="chart-card bi-chart"><div className="panel-title"><div><span>VISAO POR MARCA</span><h3>Kits vendidos</h3></div><BarChart3 size={19}/></div>{brandTotals.length ? <div className="bars">{brandTotals.map(([brand, data]) => <div className="bar-row" key={brand}><div className="bar-brand-label"><BrandLogo brand={brand} compact /><b>{data.kits.toLocaleString('pt-BR')} kits</b></div><div className={`bar-track ${isOnTarget(rate(data.kits, data.passages)) ? 'target-bar' : 'below-bar'}`}><i style={{ width: `${Math.max(6, (data.kits / maxBrandKits) * 100)}%` }} /></div><small className={isOnTarget(rate(data.kits, data.passages)) ? 'target-text' : 'below-text'}>{roundedPercent(data.kits, data.passages)} de aproveitamento - {data.passages.toLocaleString('pt-BR')} passagens</small></div>)}</div> : <p className="chart-empty">Sem dados para o periodo.</p>}</article><div className="consultant-rankings"><article className="consultant-ranking-card best"><div className="panel-title"><div><span>MELHOR PERFORMANCE</span><h3>Top 3 consultores</h3><p>Ranking global por aproveitamento.</p></div><Medal size={19}/></div><div className="consultant-rank-list">{renderConsultantRanking(bestConsultants, 'best')}</div></article><article className="consultant-ranking-card improve"><div className="panel-title"><div><span>ATENCAO COMERCIAL</span><h3>Consultores a melhorar</h3><p>Menores taxas globais de aproveitamento.</p></div><Target size={19}/></div><div className="consultant-rank-list">{renderConsultantRanking(improvementConsultants, 'improve')}</div></article></div></div></div>
    {showRanking && selectedUnit && <article className="detail-card"><div className="panel-title"><div><span>DETALHAMENTO DA UNIDADE</span><h3>{selectedUnit.brand} - {selectedUnit.store}</h3><p>{selectedUnit.manager} - {roundedPercent(selectedUnit.kits, selectedUnit.passages)} de aproveitamento</p></div><button className="icon-button" onClick={() => onSelectUnit(null)} aria-label="Fechar detalhamento"><X size={18}/></button></div><div className="detail-meta"><BrandLogo brand={selectedUnit.brand} compact /><span>{selectedUnit.passages.toLocaleString('pt-BR')} passagens</span><span>{selectedUnit.kits.toLocaleString('pt-BR')} kits</span><StatusBadge percentage={selectedUnit.percentage} hasData={selectedUnit.hasData} unitStatus={selectedUnit.unitStatus}/></div><div className="table-wrap">{consultants.length ? <table className="consultant-table"><thead><tr><th>Consultor</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">Aproveitamento</th><th>Situacao</th></tr></thead><tbody>{consultants.map((item) => <tr key={item.consultant}><td><UsersRound size={15}/>{item.consultant}</td><td className="numeric">{item.passages.toLocaleString('pt-BR')}</td><td className="numeric">{item.kits.toLocaleString('pt-BR')}</td><td className={`numeric ${isOnTarget(item.percentage) ? 'target-text' : 'below-text'}`}>{roundedPercent(item.kits, item.passages)}</td><td><StatusBadge percentage={item.percentage} compact hasData={item.hasData}/></td></tr>)}</tbody></table> : <p className="chart-empty detail-empty">Nenhum lancamento para esta unidade.</p>}</div></article>}
  </section>;
}

const SETTINGS_TYPES = [
  { key: 'brand', label: 'Marca', description: 'Montadoras disponíveis' },
  { key: 'store', label: 'Loja', description: 'Unidades por marca' },
  { key: 'manager', label: 'Gerente', description: 'Responsável por loja' },
  { key: 'consultant', label: 'Consultor', description: 'Equipe por unidade' }
];

function createCatalogEntry(catalog, entry) {
  const next = cloneCatalog(catalog);
  const value = String(entry.value || '').trim();
  if (!value) return { ok: false, message: 'Informe um nome para o cadastro.' };
  if (entry.type === 'brand') {
    if (next.brands.some((brand) => norm(brand) === norm(value))) return { ok: false, message: 'Essa Marca já está cadastrada.' };
    next.brands.push(value); next.stores[value] = []; next.managers[value] = {}; next.consultants[value] = {};
    return { ok: true, catalog: normalizeCatalog(next), message: `Marca ${value} cadastrada.` };
  }
  if (!next.brands.includes(entry.brand)) return { ok: false, message: 'Selecione uma Marca válida.' };
  if (entry.type === 'store') {
    const stores = next.stores[entry.brand] || [];
    if (stores.some((store) => norm(store) === norm(value))) return { ok: false, message: 'Essa Loja já está cadastrada para a Marca.' };
    next.stores[entry.brand] = [...stores, value];
    next.consultants[entry.brand] ||= {};
    next.consultants[entry.brand][value] = [];
    return { ok: true, catalog: normalizeCatalog(next), message: `Loja ${value} cadastrada.` };
  }
  if (!next.stores[entry.brand]?.includes(entry.store)) return { ok: false, message: 'Selecione uma Loja válida.' };
  if (entry.type === 'manager') {
    next.managers[entry.brand] = { ...(next.managers[entry.brand] || {}), [entry.store]: value };
    return { ok: true, catalog: normalizeCatalog(next), message: `Gerente da loja ${entry.store} atualizado.` };
  }
  const consultants = next.consultants[entry.brand]?.[entry.store] || [];
  if (consultants.some((consultant) => norm(consultant) === norm(value))) return { ok: false, message: 'Esse Consultor já está cadastrado para a Loja.' };
  next.consultants[entry.brand][entry.store] = [...consultants, value];
  return { ok: true, catalog: normalizeCatalog(next), message: `Consultor ${value} cadastrado.` };
}

function removeCatalogEntry(catalog, entry) {
  const next = cloneCatalog(catalog);
  if (entry.type === 'brand') {
    next.brands = next.brands.filter((brand) => brand !== entry.brand);
    delete next.stores[entry.brand]; delete next.managers[entry.brand]; delete next.consultants[entry.brand];
  } else if (entry.type === 'store') {
    next.stores[entry.brand] = (next.stores[entry.brand] || []).filter((store) => store !== entry.store);
    delete next.managers[entry.brand]?.[entry.store]; delete next.consultants[entry.brand]?.[entry.store];
  } else if (entry.type === 'manager') {
    delete next.managers[entry.brand]?.[entry.store];
  } else if (entry.type === 'consultant') {
    next.consultants[entry.brand][entry.store] = (next.consultants[entry.brand]?.[entry.store] || []).filter((consultant) => consultant !== entry.value);
  }
  return normalizeCatalog(next);
}

function SettingsPanel({ catalog, onBack, onSaveEntry, onRequestDelete, onOpenAccess }) {
  const [type, setType] = useState('brand');
  const [form, setForm] = useState({ value: '', brand: catalog.brands[0] || '', store: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm((current) => {
      const brand = catalog.brands.includes(current.brand) ? current.brand : catalog.brands[0] || '';
      const stores = catalog.stores[brand] || [];
      const store = stores.includes(current.store) ? current.store : stores[0] || '';
      return { ...current, brand, store };
    });
  }, [catalog]);

  const selectedType = SETTINGS_TYPES.find((item) => item.key === type) || SETTINGS_TYPES[0];
  const stores = catalog.stores[form.brand] || [];
  const entries = type === 'brand'
    ? catalog.brands
    : type === 'store'
      ? stores
      : type === 'manager'
        ? (catalog.managers[form.brand]?.[form.store] ? [catalog.managers[form.brand][form.store]] : [])
        : (catalog.consultants[form.brand]?.[form.store] || []);

  const selectType = (nextType) => {
    setType(nextType);
    setForm((current) => ({ ...current, value: '', store: (catalog.stores[current.brand] || [])[0] || '' }));
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (await onSaveEntry({ type, value: form.value, brand: form.brand, store: form.store })) setForm((current) => ({ ...current, value: '' }));
    } finally {
      setSaving(false);
    }
  };
  const requestDelete = (value) => {
    const brand = type === 'brand' ? value : form.brand;
    const store = type === 'store' || type === 'manager' || type === 'consultant' ? (type === 'store' ? value : form.store) : '';
    const label = `${selectedType.label}: ${value}`;
    const detail = type === 'brand'
      ? 'O cadastro da Marca será removido. Os lançamentos históricos permanecerão disponíveis para exclusão em Relatórios.'
      : type === 'store'
        ? 'A Loja, o Gerente e os Consultores vinculados serão removidos do cadastro. Os lançamentos históricos não serão apagados automaticamente.'
        : 'O cadastro selecionado será removido. Os lançamentos históricos não serão apagados automaticamente.';
    onRequestDelete({ kind: 'catalog', type, brand, store, value, label, detail });
  };

  return <section className="executive-view settings-view page-settings">
    <div className="page-banner"><div><span>CONFIGURAÇÕES • CADASTROS</span><strong>Cadastros oficiais para manter os lançamentos consistentes.</strong></div></div>
    <div className="executive-head"><div><button className="back-link" onClick={onBack}>← Visão Geral</button><span className="kicker">ADMINISTRAÇÃO LOCAL</span><h2>Configurações</h2><p>Cadastre Marcas, Lojas, Gerentes e Consultores usados nos lançamentos e filtros.</p></div><div className="settings-count"><Settings size={21}/><span>{catalog.brands.length} marcas cadastradas</span></div></div>
    <div className="settings-layout">
      <article className="settings-card settings-editor"><div className="panel-title"><div><span>NOVO CADASTRO</span><h3>Adicionar ou atualizar</h3></div><Settings size={19}/></div>
        <div className="settings-tabs">{SETTINGS_TYPES.map((item) => <button key={item.key} type="button" className={type === item.key ? 'selected' : ''} onClick={() => selectType(item.key)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
        <form className="settings-form" onSubmit={submit}>
          {type !== 'brand' && <label><span>Marca <b className="required-mark">*</b></span><select required value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value, store: (catalog.stores[event.target.value] || [])[0] || '' }))}><option value="">Selecione uma Marca</option>{catalog.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>}
          {(type === 'manager' || type === 'consultant') && <label><span>Loja <b className="required-mark">*</b></span><select required disabled={!form.brand} value={form.store} onChange={(event) => setForm((current) => ({ ...current, store: event.target.value }))}><option value="">Selecione uma Loja</option>{stores.map((store) => <option key={store} value={store}>{store}</option>)}</select></label>}
          <label><span>{type === 'brand' ? 'Nome da Marca' : type === 'store' ? 'Nome da Loja' : type === 'manager' ? 'Nome do Gerente' : 'Nome do Consultor'} <b className="required-mark">*</b></span><input required value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder={type === 'brand' ? 'Ex.: Volkswagen' : type === 'store' ? 'Ex.: Vila Mariana' : type === 'manager' ? 'Nome do responsável' : 'Nome completo'} /></label>
          {type === 'manager' && <small className="settings-helper">Cada Loja mantém um Gerente responsável. Ao salvar, o cadastro atual da unidade será atualizado.</small>}
          {type === 'consultant' && !stores.length && <small className="settings-helper">Cadastre uma Loja para habilitar o cadastro de Consultores.</small>}
           <button className="button primary" type="submit" disabled={saving}><Plus size={17}/> {saving ? 'Salvando...' : type === 'manager' ? 'Salvar gerente' : 'Adicionar cadastro'}</button>
        </form>
      </article>
      <article className="settings-card settings-list"><div className="panel-title"><div><span>CADASTRO SELECIONADO</span><h3>{selectedType.label}s</h3></div><span className="settings-list-count">{entries.length}</span></div>
        {type !== 'brand' && <label className="settings-scope"><span>Marca para consultar</span><select value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value, store: (catalog.stores[event.target.value] || [])[0] || '' }))}>{catalog.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>}
        {(type === 'manager' || type === 'consultant') && <label className="settings-scope"><span>Loja para consultar</span><select value={form.store} onChange={(event) => setForm((current) => ({ ...current, store: event.target.value }))}><option value="">Selecione uma Loja</option>{stores.map((store) => <option key={store} value={store}>{store}</option>)}</select></label>}
        <div className="settings-entry-list">{entries.length ? entries.map((entry) => <div className="settings-entry" key={entry}><div><strong>{entry}</strong><small>{type === 'brand' ? 'Marca disponível no lançamento' : type === 'store' ? `${form.brand} • unidade cadastrada` : `${form.brand} • ${form.store}`}</small></div><button type="button" className="delete" onClick={() => requestDelete(entry)} aria-label={`Excluir ${selectedType.label} ${entry}`} title={`Excluir ${selectedType.label}`}><Trash2 size={16}/></button></div>) : <div className="settings-empty"><Settings size={24}/><strong>Nenhum cadastro encontrado</strong><span>Use o formulário ao lado para adicionar o primeiro item.</span></div>}</div>
      </article>
    </div>
    <div className="settings-note"><ShieldCheck size={18}/><div><strong>Exclusão protegida</strong><span>Todo cadastro ou lançamento exige confirmação. Excluir um cadastro não apaga automaticamente o histórico.</span></div></div>
     {onOpenAccess && <button type="button" className="settings-access-link" onClick={onOpenAccess}><ShieldCheck size={17}/><span><strong>Controle de Acessos</strong><small>Administre perfis e visibilidade por Marca + Loja.</small></span><ArrowDown size={16}/></button>}
   </section>;
}

function accessRoleLabel(role) {
  if (role === 'admin') return 'Administrador';
  if (role === 'gerente') return 'Gerente';
  return 'Pendente';
}

function AdminProfileEditor({ entry, busy, onSave }) {
  const [role, setRole] = useState(entry.role || '');
  const [isActive, setIsActive] = useState(entry.is_active === true);

  useEffect(() => {
    setRole(entry.role || '');
    setIsActive(entry.is_active === true);
  }, [entry.role, entry.is_active]);

  return (
    <form
      className="admin-access-profile-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(entry.id, role || null, isActive);
      }}
    >
      <div className="admin-access-profile-card__identity">
        <strong>{entry.full_name || entry.email || 'Usuário sem nome'}</strong>
        <span>{entry.email || 'E-mail não informado'}</span>
        <small>{accessRoleLabel(entry.role)} · {entry.is_active ? 'Ativo' : 'Inativo'}</small>
      </div>
      <label>
        <span>Perfil</span>
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">Pendente</option>
          <option value="gerente">Gerente</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <label className="admin-access-checkbox">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        <span>Acesso ativo</span>
      </label>
      <button className="button secondary" type="submit" disabled={busy}>
        {busy ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}

function AdminAccessPanel({ profile, onProfileRefresh, onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [stores, setStores] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [linkUserId, setLinkUserId] = useState('');
  const [linkBrandId, setLinkBrandId] = useState('');
  const [linkStoreId, setLinkStoreId] = useState('');

  const loadAccessData = async () => {
    if (!isAdminProfile(profile)) return;
    setLoading(true);
    const [profilesResult, brandsResult, storesResult, linksResult] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, is_active, created_at').order('created_at', { ascending: true }),
      supabase.from('brands').select('id, name, is_active, created_at, updated_at').order('name', { ascending: true }),
      supabase.from('stores').select('id, brand_id, name, is_active, created_at, updated_at').order('name', { ascending: true }),
      supabase.from('user_access').select('id, user_id, brand_id, store_id, created_at, created_by').order('created_at', { ascending: true }),
    ]);
    const error = profilesResult.error || brandsResult.error || storesResult.error || linksResult.error;
    if (error) {
      setNotice({ type: 'error', text: error.message || 'Não foi possível carregar o Controle de Acessos.' });
    } else {
      setProfiles(profilesResult.data || []);
      setBrands(brandsResult.data || []);
      setStores(storesResult.data || []);
      setLinks(linksResult.data || []);
      setNotice(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminProfile(profile)) void loadAccessData();
  }, [profile?.id, profile?.role, profile?.is_active]);

  const saveProfile = async (userId, role, isActive) => {
    if (isActive && !role) {
      setNotice({ type: 'error', text: 'Um perfil ativo precisa ser Gerente ou Administrador.' });
      return;
    }
    setBusy(`profile:${userId}`);
    setNotice(null);
    try {
      const { error } = await supabase.from('profiles').update({ role, is_active: isActive }).eq('id', userId);
      if (error) {
        setNotice({ type: 'error', text: error.message || 'Não foi possível atualizar o perfil.' });
        return;
      }
      if (userId === profile.id) {
        await onProfileRefresh?.();
      } else {
        await loadAccessData();
        setNotice({ type: 'success', text: 'Perfil atualizado com sucesso.' });
      }
    } finally {
      setBusy('');
    }
  };

  const createLink = async (event) => {
    event.preventDefault();
    if (!linkUserId || !linkBrandId || !linkStoreId) {
      setNotice({ type: 'error', text: 'Selecione Usuário, Marca e Loja.' });
      return;
    }
    const selectedStore = stores.find((store) => store.id === linkStoreId);
    if (!selectedStore || selectedStore.brand_id !== linkBrandId || selectedStore.is_active === false) {
      setNotice({ type: 'error', text: 'A Loja selecionada não pertence à Marca escolhida.' });
      return;
    }
    if (links.some((link) => link.user_id === linkUserId && link.brand_id === linkBrandId && link.store_id === linkStoreId)) {
      setNotice({ type: 'error', text: 'Esse acesso já foi concedido para o usuário.' });
      return;
    }
    setBusy('link:create');
    setNotice(null);
    try {
      const { error } = await supabase.from('user_access').insert({
        user_id: linkUserId,
        brand_id: linkBrandId,
        store_id: linkStoreId,
        created_by: profile.id,
      });
      if (error) {
        setNotice({ type: 'error', text: error.message || 'Não foi possível conceder o acesso.' });
      } else {
        setLinkUserId('');
        setLinkBrandId('');
        setLinkStoreId('');
        await loadAccessData();
        setNotice({ type: 'success', text: 'Acesso concedido com sucesso.' });
      }
    } finally {
      setBusy('');
    }
  };

  const removeLink = async (linkId) => {
    setBusy(`link:${linkId}`);
    setNotice(null);
    try {
      const { error } = await supabase.from('user_access').delete().eq('id', linkId);
      if (error) {
        setNotice({ type: 'error', text: error.message || 'Não foi possível remover o acesso.' });
      } else {
        await loadAccessData();
        setNotice({ type: 'success', text: 'Acesso removido.' });
      }
    } finally {
      setBusy('');
    }
  };

  const profileById = Object.fromEntries(profiles.map((item) => [item.id, item]));
  const brandById = Object.fromEntries(brands.map((item) => [item.id, item]));
  const storeById = Object.fromEntries(stores.map((item) => [item.id, item]));
  const activeBrands = brands.filter((brand) => brand.is_active !== false);
  const activeStores = stores.filter((store) => store.is_active !== false && brandById[store.brand_id]?.is_active !== false);
  const storesForBrand = activeStores.filter((store) => store.brand_id === linkBrandId);
  const eligibleUsers = profiles.filter((entry) => entry.role === 'gerente');

  return (
    <section className="executive-view admin-access-view page-access">
      <div className="page-banner"><div><span>CONTROLE DE ACESSO · SUPABASE</span><strong>Defina quem entra e o que cada gerente pode visualizar.</strong></div></div>
      <div className="executive-head admin-access-head"><div><button className="back-link" onClick={onBack}>← Configurações</button><span className="kicker">ADMINISTRAÇÃO SEGURA</span><h2>Controle de Acessos</h2><p>Gerencie perfis e conceda visibilidade somente para combinações existentes de Marca + Loja.</p></div><div className="settings-count"><ShieldCheck size={21}/><span>{profiles.length} usuários cadastrados</span></div></div>
      {notice && <div className={`admin-access-notice ${notice.type}`}>{notice.text}</div>}
      <div className="admin-access-layout admin-access-layout--scoped">
        <article className="admin-access-card admin-access-card--wide"><div className="panel-title"><div><span>PERFIS E PERMISSÕES</span><h3>Definir perfil e ativação</h3></div><UsersRound size={19}/></div><p className="admin-access-card__hint">O e-mail vem do cadastro Auth. Defina Administrador ou Gerente e ative o acesso quando o usuário estiver aprovado.</p>{loading ? <div className="admin-access-empty">Carregando usuários...</div> : <div className="admin-access-profile-list">{profiles.length ? profiles.map((entry) => <AdminProfileEditor key={entry.id} entry={entry} busy={busy === `profile:${entry.id}`} onSave={saveProfile} />) : <div className="admin-access-empty">Nenhum perfil encontrado.</div>}</div>}</article>
        <article className="admin-access-card"><div className="panel-title"><div><span>DESTINAR VISIBILIDADE</span><h3>Usuário → Marca → Loja</h3></div><ShieldCheck size={19}/></div><p className="admin-access-card__hint">Selecione somente registros existentes. Cada vínculo é independente e pode ser acumulado.</p><form className="admin-access-form" onSubmit={createLink}><label><span>Usuário</span><select value={linkUserId} onChange={(event) => setLinkUserId(event.target.value)} required><option value="">Selecione um gerente</option>{eligibleUsers.map((entry) => <option key={entry.id} value={entry.id}>{entry.email || entry.full_name || entry.id} · {entry.is_active ? 'Ativo' : 'Inativo'}</option>)}</select></label><label><span>Marca</span><select value={linkBrandId} onChange={(event) => { setLinkBrandId(event.target.value); setLinkStoreId(''); }} required><option value="">Selecione uma Marca</option>{activeBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label><span>Loja</span><select value={linkStoreId} onChange={(event) => setLinkStoreId(event.target.value)} disabled={!linkBrandId} required><option value="">{linkBrandId ? (storesForBrand.length ? 'Selecione uma Loja' : 'Nenhuma loja ativa') : 'Selecione a Marca primeiro'}</option>{storesForBrand.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><button className="button primary" type="submit" disabled={!activeStores.length || busy === 'link:create'}><UsersRound size={17}/> {busy === 'link:create' ? 'Vinculando...' : 'Conceder acesso'}</button></form></article>
        <article className="admin-access-card admin-access-card--links"><div className="panel-title"><div><span>ACESSOS CONCEDIDOS</span><h3>Marca + Loja por usuário</h3></div><ShieldCheck size={19}/></div>{loading ? <div className="admin-access-empty">Carregando acessos...</div> : links.length ? <div className="admin-access-table-wrap"><table className="admin-access-table"><thead><tr><th>Usuário / e-mail</th><th>Perfil</th><th>Marca</th><th>Loja</th><th aria-label="Ações"/></tr></thead><tbody>{links.map((link) => <tr key={link.id}><td><strong>{profileById[link.user_id]?.full_name || 'Usuário'}</strong><small>{profileById[link.user_id]?.email || 'E-mail não informado'}</small></td><td>{accessRoleLabel(profileById[link.user_id]?.role)}<small>{profileById[link.user_id]?.is_active ? 'Ativo' : 'Inativo'}</small></td><td>{brandById[link.brand_id]?.name || 'Marca removida'}</td><td>{storeById[link.store_id]?.name || 'Loja removida'}</td><td><button type="button" className="button ghost danger-text" onClick={() => removeLink(link.id)} disabled={busy === `link:${link.id}`}>Remover</button></td></tr>)}</tbody></table></div> : <div className="admin-access-empty">Nenhum acesso concedido.</div>}</article>
      </div>
    </section>
  );
}

function PrintReport({ rows, filters, summary }) {
  const period = [filters.from && displayDate(filters.from), filters.to && displayDate(filters.to)].filter(Boolean).join(' até ') || 'Todo o período';
  return <section className="print-report"><header><div><span>RELATÓRIO EXECUTIVO • SENSES CAR</span><h1>Relatório de Resultados</h1><p>{period} • Meta oficial de aproveitamento: 40%</p></div><BrandLogo brand={filters.brand} compact /></header><div className="print-summary"><div><span>Passagens</span><strong>{summary.passages.toLocaleString('pt-BR')}</strong></div><div><span>Kits vendidos</span><strong>{summary.kits.toLocaleString('pt-BR')}</strong></div><div><span>Aproveitamento</span><strong>{roundedPercent(summary.kits, summary.passages)}</strong></div></div><table><thead><tr><th>Data da Importação</th><th>Marca</th><th>Loja</th><th>Status da Unidade</th><th>Gerente</th><th>Consultor</th><th className="numeric">Passagens</th><th className="numeric">Kits Vendidos</th><th className="numeric">% Aproveitamento</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{displayDateTime(item.importedAt, item.importDate || item.date)}</td><td>{item.brand || '—'}</td><td>{item.store || '—'}</td><td><UnitStatusBadge status={item.unitStatus || unitStatusFor(item.brand, item.store, item)} compact/></td><td>{item.manager || '—'}</td><td>{item.consultant || '—'}</td><td className="numeric">{number(item.passages).toLocaleString('pt-BR')}</td><td className="numeric">{number(item.kits).toLocaleString('pt-BR')}</td><td className={`numeric ${isOnTarget(rate(item.kits, item.passages)) ? 'target-text' : 'below-text'}`}>{roundedPercent(item.kits, item.passages)}</td></tr>)}</tbody></table><footer>Gerado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}</footer></section>;
}

function PrintCommission({ rows, view, summary }) {
  const isManagers = view === 'managers';
  const isConsultants = view === 'consultants';
  const showManagerPerformance = isManagers && Boolean(rows.length) && summary.hasManagerPerformance && rows.every((row) => row.hasPerformance && row.competence === JUNE_MANAGER_COMMISSION_COMPETENCE);
  return <section className="print-report print-commission"><header><div><span>CONFERÊNCIA DE COMISSÕES • SENSES CAR</span><h1>Comissões — {commissionViewLabel(view)}</h1><p>Histórico por Competência + Marca + Loja.</p></div></header><div className="print-summary">{isManagers ? <><div><span>Quantidade de Gerentes</span><strong>{summary.managers.toLocaleString('pt-BR')}</strong></div>{showManagerPerformance && <div><span>Gerentes Elegíveis</span><strong>{summary.eligibleManagers.toLocaleString('pt-BR')}</strong></div>}<div><span>Total Pago aos Gerentes</span><strong>{formatCommissionCurrency(summary.totalPaidManagers)}</strong></div><div><span>Data de Pagamento</span><strong>{paymentDateLabel(summary.managerPaymentDate)}</strong></div></> : isConsultants ? <><div><span>Quantidade de Consultores</span><strong>{summary.consultants.toLocaleString('pt-BR')}</strong></div><div><span>Total Pago aos Consultores</span><strong>{formatCommissionCurrency(summary.totalPaidConsultants)}</strong></div><div><span>Data de Pagamento</span><strong>{paymentDateLabel(summary.consultantPaymentDate)}</strong></div></> : <><div><span>Total Pago aos Gerentes</span><strong>{formatCommissionCurrency(summary.totalPaidManagers)}</strong></div><div><span>Total Pago aos Consultores</span><strong>{formatCommissionCurrency(summary.totalPaidConsultants)}</strong></div><div><span>Total Geral</span><strong>{formatCommissionCurrency(summary.totalPaid)}</strong></div></>}</div><table><thead><tr><th>Marca</th><th>Loja</th><th>Status da Unidade</th>{!isConsultants && <th>Gerente</th>}{isConsultants && <th>Consultor</th>}{view === 'all' && <th>Consultor</th>}{showManagerPerformance ? <><th className="numeric">Passagens</th><th className="numeric">Kits</th><th className="numeric">% Aproveitamento</th><th className="numeric">Comissão</th></> : <><th>Competência</th><th className="numeric">Valor Pago</th></>}<th>Data de Pagamento</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key} className={showManagerPerformance && row.eligible !== null ? (row.eligible ? 'commission-row--eligible' : 'commission-row--ineligible') : ''}><td>{row.brand || '—'}</td><td>{row.store || '—'}</td><td><UnitStatusBadge status={row.unitStatus} compact/></td>{!isConsultants && <td>{row.manager || '—'}</td>}{isConsultants && <td>{row.consultant || '—'}</td>}{view === 'all' && <td>{row.consultant || '—'}</td>}{showManagerPerformance ? <><td className="numeric">{number(row.passages).toLocaleString('pt-BR')}</td><td className="numeric">{number(row.kits).toLocaleString('pt-BR')}</td><td className={`numeric ${row.eligible === null ? '' : row.eligible ? 'target-text' : 'below-text'}`}>{roundedPercent(row.kits, row.passages)}</td><td className="numeric">{formatCommissionCurrency(row.commission)}</td></> : <><td>{row.period}</td><td className="numeric">{formatCommissionCurrency(row.commission)}</td></>}<td>{paymentDateLabel(row.paymentDate)}</td></tr>)}</tbody></table><footer>Gerado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}</footer></section>;
}

function OverviewHero({ totals }) {
  return <section className="overview-hero"><div className="overview-hero-copy"><div className="hero-kicker"><span className="hero-line"/> EXPERIÊNCIA SENSES CAR</div><SensesLogo className="hero-senses-logo" alt="Senses Car • Tecnologia no Ar"/><h2>Performance comercial<br/><em>com experiência automotiva.</em></h2><p>Acompanhe a jornada de cada unidade, do primeiro contato ao resultado de venda, em uma central executiva pensada para a diretoria.</p><div className="hero-mini-metrics"><div><span>Passagens</span><strong>{totals.passages.toLocaleString('pt-BR')}</strong></div><div><span>Kits vendidos</span><strong>{totals.kits.toLocaleString('pt-BR')}</strong></div><div><span>Aproveitamento</span><strong>{roundedPercent(totals.kits, totals.passages)}</strong></div></div></div><div className="overview-hero-media"><img src="./visuals/overview-products.png" alt="Produtos Senses Car no interior de um veículo"/><div className="media-shade"/><span className="media-caption">PRODUTO • EXPERIÊNCIA • PERFORMANCE</span></div></section>;
}

const matchesExecutiveFilters = (item, filters) => {
  if (!withinDateRange(item, filters)) return false;
  if (filters.brand && item.brand !== filters.brand) return false;
  if (filters.store && item.store !== filters.store) return false;
  if (filters.manager && item.manager !== filters.manager) return false;
  if (filters.consultant && item.consultant !== filters.consultant) return false;
  return true;
};
const dateRangeOverlapsMonth = (filters, month) => {
  const first = `${month}-01`;
  const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);
  return (!filters.from || last >= filters.from) && (!filters.to || first <= filters.to);
};
const historicalManagerOptionsFor = (filters, catalog) => Object.entries(HISTORICAL_MANAGER_BY_COMPETENCE)
  .filter(([month]) => dateRangeOverlapsMonth(filters, month))
  .flatMap(([, brands]) => Object.entries(brands)
    .filter(([brand]) => !filters.brand || norm(brand) === norm(filters.brand))
    .flatMap(([brand, stores]) => Object.entries(stores)
      .filter(([store]) => !filters.store || historicalStoreKey(store) === historicalStoreKey(filters.store))
      .map(([, manager]) => manager)))
  .concat(filters.brand && filters.store ? [catalogManagerFor(catalog, filters.brand, filters.store)] : [])
  .filter(Boolean);
const filterOptionsFor = (filters, catalog, rows = []) => {
  const brands = catalog.brands;
  const stores = filters.brand ? (catalog.stores[filters.brand] || []) : uniqueText(Object.values(catalog.stores).flat()).sort();
  const candidateRows = rows.filter((item) => withinDateRange(item, filters) && (!filters.brand || item.brand === filters.brand) && (!filters.store || item.store === filters.store));
  const catalogManagers = filters.brand
    ? (filters.store
      ? [catalogManagerFor(catalog, filters.brand, filters.store)]
      : (catalog.stores[filters.brand] || []).map((store) => catalogManagerFor(catalog, filters.brand, store)))
    : catalog.brands.flatMap((brand) => (catalog.stores[brand] || []).map((store) => catalogManagerFor(catalog, brand, store)));
  const managers = uniqueText([...catalogManagers, ...historicalManagerOptionsFor(filters, catalog), ...candidateRows.map((item) => item.manager)]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const consultantMap = filters.brand ? catalog.consultants[filters.brand] || {} : catalog.consultants;
  const consultants = filters.brand
    ? (filters.store ? uniqueText([...(catalog.consultants[filters.brand]?.[filters.store] || []), ...candidateRows.map((item) => item.consultant)]).sort() : uniqueText([...Object.values(consultantMap).flat(), ...candidateRows.map((item) => item.consultant)]).sort())
    : uniqueText([...Object.values(consultantMap).flatMap((storesByConsultant) => Object.values(storesByConsultant).flat()), ...candidateRows.map((item) => item.consultant)]).sort();
  return { brands, stores, managers, consultants };
};

const commissionDateKey = (item) => {
  return competenceDateKey(item);
};

const commissionMonthLabel = (value) => {
  if (!value) return 'Todos os meses';
  const parsed = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parsed);
};

const commissionMonthOptionLabel = (value) => commissionMonthLabel(value).replace(/^./, (letter) => letter.toUpperCase());

const commissionValueFromRecord = (item) => {
  const raw = item?.commission ?? item?.commissionValue ?? item?.commissionAmount;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  return number(raw);
};
const commissionRecordHasPerformance = (item) => ['passages', 'kits', 'percentage', 'eligible'].some((field) => Object.prototype.hasOwnProperty.call(item || {}, field));
const commissionManagerLabelFor = (item) => {
  const juneReference = competenceMonthKey(item) === JUNE_MANAGER_COMMISSION_COMPETENCE
    ? juneManagerReferenceFor(item?.brand, item?.store)
    : null;
  return juneReference?.manager || item?.managerName || item?.manager || '';
};

const commissionTotalForRecords = (rows) => {
  const values = rows.map(commissionValueFromRecord).filter((value) => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
};
const isManagerCommissionRecord = (item) => !item?.consultant && !item?.consultantName && !norm(item?.commissionType || item?.type).includes('consultor');
const isConsultantCommissionRecord = (item) => Boolean(item?.consultant || item?.consultantName) || norm(item?.commissionType || item?.type).includes('consultor');

const formatCommissionCurrency = (value) => value === null || value === undefined
  ? '—'
  : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paymentDateLabel = (value) => {
  if (!value) return 'Não informada';
  if (value === 'Várias datas') return value;
  const parsed = competenceDateKey(value);
  return parsed ? displayDate(parsed) : 'Não informada';
};

const commissionCatalogUnits = (catalog, month = '') => catalog.brands.flatMap((brand) => (catalog.stores[brand] || []).map((store) => {
  const juneReference = month === JUNE_MANAGER_COMMISSION_COMPETENCE ? juneManagerReferenceFor(brand, store) : null;
  return {
    brand,
    store,
    manager: juneReference?.manager || managerForCompetence(catalog, brand, store, month || undefined),
    consultants: catalog.consultants[brand]?.[store] || [],
  };
}));

const matchesCommissionFilters = (item, filters, excluded = '') => {
  const date = commissionDateKey(item);
  const manager = commissionManagerLabelFor(item);
  const consultant = item.consultant || item.consultantName || '';
  if (excluded !== 'month' && filters.month && (!date || date.slice(0, 7) !== filters.month)) return false;
  if (excluded !== 'brands' && filters.brands?.length && !filters.brands.includes(item.brand)) return false;
  if (excluded !== 'stores' && filters.stores?.length && !filters.stores.includes(item.store)) return false;
  if (excluded !== 'manager' && filters.manager && manager !== filters.manager) return false;
  if (excluded !== 'consultant' && filters.consultant && consultant !== filters.consultant) return false;
  return true;
};

const commissionFilterOptionsFor = (filters, catalog, commissionRecords = [], performanceRecords = [], view = 'all') => {
  const scopedPerformanceRecords = view === 'managers'
    ? performanceRecords.filter((item) => !isJuneManagerExcludedRecord(item))
    : performanceRecords;
  const allRecords = [...commissionRecords, ...scopedPerformanceRecords];
  const units = commissionCatalogUnits(catalog, filters.month)
    .filter((unit) => !(view === 'managers' && filters.month === JUNE_MANAGER_COMMISSION_COMPETENCE && !isJuneManagerUnitIncluded(unit)));
  const unitsFor = (excluded) => units.filter((unit) => {
    if (excluded !== 'brands' && filters.brands?.length && !filters.brands.includes(unit.brand)) return false;
    if (excluded !== 'stores' && filters.stores?.length && !filters.stores.includes(unit.store)) return false;
    if (excluded !== 'manager' && filters.manager && unit.manager !== filters.manager) return false;
    if (excluded !== 'consultant' && filters.consultant && !unit.consultants.includes(filters.consultant)) return false;
    return true;
  });
  const recordsFor = (excluded) => allRecords.filter((item) => matchesCommissionFilters(item, filters, excluded));
  const historicalManagers = view === 'managers' && filters.month === JUNE_MANAGER_COMMISSION_COMPETENCE
    ? []
    : historicalManagerOptionsFor({ from: filters.month ? `${filters.month}-01` : '', to: filters.month ? `${filters.month}-31` : '', brand: filters.brands.length === 1 ? filters.brands[0] : '', store: filters.stores.length === 1 ? filters.stores[0] : '' }, catalog);
  const brands = uniqueText([...unitsFor('brands').map((unit) => unit.brand), ...recordsFor('brands').map((item) => item.brand)]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const stores = uniqueText([...unitsFor('stores').map((unit) => unit.store), ...recordsFor('stores').map((item) => item.store)]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const managers = uniqueText([
    ...unitsFor('manager').map((unit) => unit.manager),
    ...recordsFor('manager').map(commissionManagerLabelFor),
    ...historicalManagers,
  ]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const consultants = uniqueText([
    ...unitsFor('consultant').flatMap((unit) => unit.consultants),
    ...scopedPerformanceRecords.filter((item) => matchesCommissionFilters(item, filters, 'consultant')).map((item) => item.consultant),
  ]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return { brands, stores, managers, consultants };
};

const commissionRowsForView = (commissionRecords, performanceRecords, view) => {
  const consultantPerformanceRecords = performanceRecords
    .filter((item) => item.consultant && commissionValueFromRecord(item) !== null)
    .map((item) => ({
      ...item,
      competence: competenceMonthKey(item),
      commissionType: item.commissionType || item.type || 'Comissão Consultor',
      commissionValue: commissionValueFromRecord(item),
    }));
  const source = view === 'managers'
    ? commissionRecords.filter(isManagerCommissionRecord)
    : view === 'consultants'
      ? [...commissionRecords.filter((item) => item.consultant || item.consultantName), ...consultantPerformanceRecords]
      : [...commissionRecords, ...consultantPerformanceRecords];
  const groups = new Map();
  source.forEach((item) => {
    const brand = item.brand || 'Sem marca';
    const store = item.store || 'Sem loja';
    const manager = item.managerName || item.manager || 'Sem gerente';
    const consultant = item.consultant || 'Sem consultor';
    const competence = competenceMonthKey(item);
    const commissionType = item.commissionType || item.type || 'Comissão';
    const consolidateManager = view === 'managers'
      && competence === JUNE_MANAGER_COMMISSION_COMPETENCE
      && commissionRecordHasPerformance(item);
    const key = consolidateManager
      ? `${norm(manager)}|${competence}|${norm(commissionType)}`
      : `${norm(brand)}|${historicalStoreKey(store)}|${norm(manager)}|${competence}|${norm(commissionType)}|${norm(consultant)}`;
    if (!groups.has(key)) groups.set(key, {
      key,
      brand,
      store,
      brands: new Set([brand]),
      stores: new Set([store]),
      manager,
      consultant: consultant === 'Sem consultor' ? '' : consultant,
      competence,
      commissionType,
      commission: 0,
      paymentDates: new Set(),
      passages: 0,
      kits: 0,
      hasPerformance: false,
      eligibilityValues: new Set(),
      unitStatusValues: new Set(),
    });
    const group = groups.get(key);
    group.brands.add(brand);
    group.stores.add(store);
    group.unitStatusValues.add(unitStatusFor(brand, store, item));
    group.commission += commissionValueFromRecord(item) ?? 0;
    if (commissionRecordHasPerformance(item)) {
      group.hasPerformance = true;
      group.passages += number(item.passages);
      group.kits += number(item.kits);
      group.eligibilityValues.add(item.eligible ?? isOnTarget(number(item.percentage)));
    }
    if (item.paymentDate) group.paymentDates.add(String(item.paymentDate));
  });
  return [...groups.values()]
    .map((group) => {
      const percentage = group.hasPerformance ? rate(group.kits, group.passages) : null;
      const brands = [...group.brands];
      const stores = [...group.stores];
      const eligibilityValues = [...group.eligibilityValues];
      const unitStatuses = [...group.unitStatusValues];
      return {
        ...group,
        brand: brands.join(' / '),
        store: stores.join(' / '),
        brands,
        stores,
        unitStatus: unitStatuses.includes(UNIT_STATUS_DISCONTINUED) ? UNIT_STATUS_DISCONTINUED : unitStatuses[0] || UNIT_STATUS_ACTIVE,
        percentage,
        eligible: group.hasPerformance
          ? eligibilityValues.length === 1 ? eligibilityValues[0] : null
          : null,
        paymentDate: group.paymentDates.size === 1 ? [...group.paymentDates][0] : group.paymentDates.size > 1 ? 'Várias datas' : '',
        period: group.competence ? commissionMonthOptionLabel(group.competence) : 'Sem competência',
      };
    })
    .sort((a, b) => a.competence.localeCompare(b.competence) || a.brand.localeCompare(b.brand, 'pt-BR') || a.store.localeCompare(b.store, 'pt-BR') || a.manager.localeCompare(b.manager, 'pt-BR'));
};

const summarizeCommissionValues = (values, singular) => {
  if (!values.length) return '—';
  if (values.length === 1) return values[0];
  if (values.length <= 2) return values.join(' • ');
  return `${values[0]} • ${values[1]} +${values.length - 2} ${singular}`;
};

const commissionViewLabel = (view) => ({
  all: 'Todos',
  managers: 'Gerentes',
  consultants: 'Consultores',
}[view] || 'Todos');

function CommissionMultiSelect({ label, values, options, onChange }) {
  const summary = values.length === 0 ? 'Todas' : values.length === 1 ? values[0] : `${values.length} selecionadas`;
  const toggle = (value) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  return <details className={`commission-multi-filter ${values.length ? 'has-value' : ''}`}>
    <summary><span>{label}</span><strong title={summary}>{summary}</strong><ChevronDown size={14}/></summary>
    <div className="commission-multi-options" role="group" aria-label={`Opções de ${label}`}>
      {options.length ? options.map((option) => <label key={option}><input type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)}/><span>{option}</span></label>) : <em>Nenhuma opção relacionada aos filtros atuais.</em>}
    </div>
  </details>;
}

function CommissionFilterPanel({ filters, setFilters, options, monthOptions, onClear, view }) {
  useEffect(() => {
    setFilters((current) => {
      const brands = current.brands.filter((value) => options.brands.includes(value));
      const stores = current.stores.filter((value) => options.stores.includes(value));
      const manager = current.manager && options.managers.includes(current.manager) ? current.manager : '';
      const consultant = view === 'managers' ? '' : (current.consultant && options.consultants.includes(current.consultant) ? current.consultant : '');
      if (brands.length === current.brands.length && stores.length === current.stores.length && manager === current.manager && consultant === current.consultant) return current;
      return { ...current, brands, stores, manager, consultant };
    });
  }, [options, setFilters, view]);

  const applied = [];
  if (filters.month) applied.push({ key: 'month', label: commissionMonthLabel(filters.month) });
  if (filters.brands.length) applied.push({ key: 'brands', label: filters.brands.length === 1 ? filters.brands[0] : `${filters.brands.length} marcas` });
  if (filters.stores.length) applied.push({ key: 'stores', label: filters.stores.length === 1 ? filters.stores[0] : `${filters.stores.length} lojas` });
  if (filters.manager) applied.push({ key: 'manager', label: filters.manager });
  if (view !== 'managers' && filters.consultant) applied.push({ key: 'consultant', label: filters.consultant });
  const remove = (key) => setFilters((current) => ({ ...current, [key]: ['brands', 'stores'].includes(key) ? [] : '' }));
  return <section className="commission-filter-panel">
    <div className="filter-panel-heading"><div><span className="filter-kicker"><Filter size={14}/> FILTROS DE CONFERÊNCIA</span><strong>Relacione competência, marca, loja e responsável.</strong></div><button type="button" className="filter-clear" onClick={onClear}><X size={14}/> Limpar filtros</button></div>
    <div className="commission-filter-grid">
      <label className="filter-field"><span><CalendarRange size={14}/> Competência / Período</span><select value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}><option value="">Todos os meses</option>{monthOptions.map((month) => <option key={month} value={month}>{commissionMonthOptionLabel(month)}</option>)}</select><ChevronDown size={14}/></label>
      <CommissionMultiSelect label="Marca" values={filters.brands} options={options.brands} onChange={(brands) => setFilters((current) => ({ ...current, brands }))}/>
      <CommissionMultiSelect label="Loja / Unidade" values={filters.stores} options={options.stores} onChange={(stores) => setFilters((current) => ({ ...current, stores }))}/>
      <label className="filter-field"><span>Gerente</span><select value={filters.manager} onChange={(event) => setFilters((current) => ({ ...current, manager: event.target.value }))}><option value="">Todos os gerentes</option>{options.managers.map((manager) => <option key={manager} value={manager}>{manager}</option>)}</select><ChevronDown size={14}/></label>
      {view !== 'managers' && <label className="filter-field"><span>Consultor</span><select value={filters.consultant} onChange={(event) => setFilters((current) => ({ ...current, consultant: event.target.value }))}><option value="">Todos os consultores</option>{options.consultants.map((consultant) => <option key={consultant} value={consultant}>{consultant}</option>)}</select><ChevronDown size={14}/></label>}
    </div>
    <div className="applied-filters"><div><span>Filtros aplicados</span>{applied.length ? applied.map((item) => <button type="button" className="filter-chip" key={item.key} onClick={() => remove(item.key)}>{item.label}<X size={12}/></button>) : <em>Nenhum filtro aplicado · visão consolidada</em>}</div>{applied.length > 1 && <button type="button" className="filter-clear filter-clear-inline" onClick={onClear}>Limpar todos</button>}</div>
  </section>;
}

function CommissionTable({ rows, view, showManagerPerformance = false }) {
  const isManagers = view === 'managers';
  const isConsultants = view === 'consultants';
  const showPerformance = isManagers && showManagerPerformance;
  return <table className={`commission-table commission-table--ledger commission-table--${isManagers ? 'manager' : isConsultants ? 'consultant' : 'all'} ${showPerformance ? 'commission-table--manager-performance' : ''}`}>
    <thead><tr><th>Marca</th><th>Loja</th><th>Status da Unidade</th>{!isConsultants && <th>Gerente</th>}{isConsultants && <th>Consultor</th>}{view === 'all' && <th>Consultor</th>}{showPerformance ? <><th className="numeric">Passagens</th><th className="numeric">Kits</th><th className="numeric">% Aproveitamento</th><th className="numeric">Comissão</th></> : <><th>Competência</th><th className="numeric">Valor Pago</th></>}<th>Data de Pagamento</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.key} className={showPerformance ? (row.eligible === null ? '' : row.eligible ? 'commission-row--eligible' : 'commission-row--ineligible') : ''}><td>{row.brands?.length > 1 ? <span className="commission-brand-list">{row.brands.join(' / ')}</span> : <BrandLogo brand={row.brand} compact/>}</td><td>{row.store}</td><td><UnitStatusBadge status={row.unitStatus} compact/></td>{!isConsultants && <td>{row.manager}</td>}{isConsultants && <td>{row.consultant || '—'}</td>}{view === 'all' && <td>{row.consultant || '—'}</td>}{showPerformance ? <><td className="numeric">{number(row.passages).toLocaleString('pt-BR')}</td><td className="numeric">{number(row.kits).toLocaleString('pt-BR')}</td><td className={`numeric ${row.eligible === null ? '' : row.eligible ? 'target-text' : 'below-text'}`}>{roundedPercent(row.kits, row.passages)}</td><td className="numeric commission-amount">{formatCommissionCurrency(row.commission)}</td></> : <><td>{row.period}</td><td className="numeric commission-amount">{formatCommissionCurrency(row.commission)}</td></>}<td>{paymentDateLabel(row.paymentDate)}</td></tr>)}</tbody>
  </table>;
}

function CommissionsPanel({ records, commissionRecords, catalog, onBack, onExportXlsx, onExportPdf }) {
  const [view, setView] = useState('managers');
  const [filters, setFilters] = useState(() => ({ ...EMPTY_COMMISSION_FILTERS, brands: [], stores: [] }));
  const monthOptions = useMemo(() => uniqueText([
    ...records.map(commissionDateKey),
    ...commissionRecords.map(commissionDateKey),
  ].filter(Boolean).map((date) => date.slice(0, 7))).sort((a, b) => b.localeCompare(a)), [records, commissionRecords]);
  const options = useMemo(() => commissionFilterOptionsFor(filters, catalog, commissionRecords, records, view), [filters, catalog, commissionRecords, records, view]);
  const filteredCommissionRecords = useMemo(() => commissionRecords.filter((item) => matchesCommissionFilters(item, filters)), [commissionRecords, filters]);
  const filteredPerformanceRecords = useMemo(() => records.filter((item) => matchesCommissionFilters(item, filters)
    && !(view === 'managers' && isJuneManagerExcludedRecord(item))), [records, filters, view]);
  const commissionRows = useMemo(() => commissionRowsForView(filteredCommissionRecords, filteredPerformanceRecords, view), [filteredCommissionRecords, filteredPerformanceRecords, view]);
  const summary = useMemo(() => {
    const managerRecords = filteredCommissionRecords.filter(isManagerCommissionRecord);
    const consultantRecords = [
      ...filteredCommissionRecords.filter(isConsultantCommissionRecord),
      ...filteredPerformanceRecords.filter((item) => item.consultant && commissionValueFromRecord(item) !== null),
    ];
    const managerValues = managerRecords.map(commissionValueFromRecord).filter((value) => value !== null);
    const totalManagerCommission = managerValues.reduce((total, value) => total + value, 0);
    const totalConsultantCommission = consultantRecords.map(commissionValueFromRecord).filter((value) => value !== null).reduce((total, value) => total + value, 0);
    const paymentDateFor = (rows) => {
      const values = uniqueText(rows.map((item) => item.paymentDate).filter(Boolean));
      return values.length === 1 ? values[0] : values.length > 1 ? 'Várias datas' : '';
    };
    const passages = sumPassages(filteredPerformanceRecords);
    const kits = sumKits(filteredPerformanceRecords);
    const managerNameKey = (item) => norm(item.managerName || item.manager);
    const managerNames = new Set(managerRecords.map(managerNameKey).filter(Boolean));
    const eligibleManagerNames = new Set(managerRecords
      .filter((item) => commissionRecordHasPerformance(item) && (item.eligible ?? isOnTarget(number(item.percentage))))
      .map(managerNameKey)
      .filter(Boolean));
    return {
      passages,
      kits,
      percentage: rate(kits, passages),
      managers: managerNames.size,
      eligibleManagers: eligibleManagerNames.size,
      hasManagerPerformance: managerRecords.some(commissionRecordHasPerformance),
      consultants: uniqueText(filteredPerformanceRecords.map((item) => item.consultant).concat(consultantRecords.map((item) => item.consultant || item.consultantName))).length,
      totalPaidManagers: totalManagerCommission,
      managerPaymentDate: paymentDateFor(managerRecords),
      totalPaidConsultants: totalConsultantCommission,
      consultantPaymentDate: paymentDateFor(consultantRecords),
      totalPaid: totalManagerCommission + totalConsultantCommission,
    };
  }, [filteredCommissionRecords, filteredPerformanceRecords]);
  const showManagerPerformance = view === 'managers'
    && filters.month === JUNE_MANAGER_COMMISSION_COMPETENCE
    && summary.hasManagerPerformance;
  const isJulyManagerCommission = view === 'managers' && filters.month === JULY_MANAGER_COMMISSION_COMPETENCE;
  const isConsultantCommissionRuleMonth = view !== 'managers' && CONSULTANT_COMMISSION_COMPETENCES.includes(filters.month);
  const isJulyConsultantCommission = view !== 'managers' && filters.month === JULY_MANAGER_COMMISSION_COMPETENCE;
  const commissionContextNote = showManagerPerformance
    ? 'Junho/2026: nomes, unidades e valores seguem exclusivamente a referência oficial.'
    : isJulyManagerCommission
      ? 'Julho/2026: BYD permanece em R$ 0,00 e será apurada com o fechamento de Agosto; as demais unidades usam Kits × R$ 5,00 quando o aproveitamento for ≥ 40% ou Kits × R$ 2,50 quando for < 40%. Braz Leme permanece descontinuada.'
      : isJulyConsultantCommission
        ? 'Consultores em Julho/2026: a faixa usa o aproveitamento consolidado da própria loja em Julho — kits × R$ 15,00 quando ≥ 40% ou kits × R$ 7,50 quando < 40%; BYD permanece em R$ 0,00.'
      : isConsultantCommissionRuleMonth
        ? 'Consultores: a faixa é definida pelo aproveitamento da loja em Junho/2026 — kits × R$ 15,00 quando ≥ 40% ou kits × R$ 7,50 quando < 40%; Maio reutiliza a mesma faixa de Junho.'
        : 'Valores financeiros vêm do histórico de comissões e não são calculados por Passagens, Kits ou meta.';
  const clearFilters = () => setFilters({ ...EMPTY_COMMISSION_FILTERS, brands: [], stores: [] });
  const tabs = [
    { key: 'all', label: 'Todos', detail: 'Visão completa da operação' },
    { key: 'managers', label: 'Gerentes', detail: 'Consolidado por responsável' },
    { key: 'consultants', label: 'Consultores', detail: 'Detalhamento individual' },
  ];
  const kpiCards = view === 'managers'
    ? showManagerPerformance
      ? [
        { className: 'navy', label: 'Quantidade de Gerentes', value: summary.managers.toLocaleString('pt-BR'), detail: 'Gerentes/unidades considerados em Junho/2026' },
        { className: 'beige', label: 'Gerentes Elegíveis', value: summary.eligibleManagers.toLocaleString('pt-BR'), detail: 'Unidades com comissão positiva na referência oficial' },
        { className: 'blue', label: 'Total Pago aos Gerentes', value: formatCommissionCurrency(summary.totalPaidManagers), detail: 'Soma dos valores oficiais de Junho/2026' },
        { className: 'light', label: 'Data de Pagamento', value: paymentDateLabel(summary.managerPaymentDate), detail: 'Data cadastrada no histórico' },
      ]
      : [
        { className: 'navy', label: 'Quantidade de Gerentes', value: summary.managers.toLocaleString('pt-BR'), detail: 'Gerentes na competência selecionada' },
        { className: 'beige', label: 'Total Pago aos Gerentes', value: formatCommissionCurrency(summary.totalPaidManagers), detail: 'Soma dos registros financeiros' },
        { className: 'blue', label: 'Data de Pagamento', value: paymentDateLabel(summary.managerPaymentDate), detail: 'Informação registrada no histórico' },
      ]
    : view === 'consultants'
      ? [
        { className: 'navy', label: 'Quantidade de Consultores', value: summary.consultants.toLocaleString('pt-BR'), detail: 'Consultores na competência selecionada' },
        { className: 'beige', label: 'Total Pago aos Consultores', value: formatCommissionCurrency(summary.totalPaidConsultants), detail: 'Soma dos registros financeiros' },
        { className: 'blue', label: 'Data de Pagamento', value: paymentDateLabel(summary.consultantPaymentDate), detail: 'Informação registrada no histórico' },
      ]
      : [
        { className: 'navy', label: 'Total Pago aos Gerentes', value: formatCommissionCurrency(summary.totalPaidManagers), detail: 'Soma dos registros de Gerentes' },
        { className: 'beige', label: 'Total Pago aos Consultores', value: formatCommissionCurrency(summary.totalPaidConsultants), detail: 'Soma dos registros de Consultores' },
        { className: 'blue', label: 'Total Geral', value: formatCommissionCurrency(summary.totalPaid), detail: 'Gerentes + Consultores' },
        { className: 'light', label: 'Quantidade de Gerentes', value: summary.managers.toLocaleString('pt-BR'), detail: 'Registros financeiros filtrados' },
        { className: 'light', label: 'Quantidade de Consultores', value: summary.consultants.toLocaleString('pt-BR'), detail: 'Registros financeiros filtrados' },
      ];
  const changeView = (nextView) => {
    setView(nextView);
    if (nextView === 'managers') setFilters((current) => ({ ...current, consultant: '' }));
  };
  return <section className="executive-view commission-view page-commissions">
    <div className="page-banner"><div><span>COMISSÕES · CONFERÊNCIA ADMINISTRATIVA</span><strong>Performance pronta para a próxima etapa.</strong></div></div>
    <div className="executive-head"><div><button className="back-link" onClick={onBack}>← Visão Geral</button><span className="kicker">CENTRAL DE PERFORMANCE</span><h2>Comissões{filters.month ? ` — ${commissionMonthOptionLabel(filters.month)}` : ''}</h2><p>{isJulyManagerCommission ? 'Julho/2026: BYD fica em R$ 0,00 até o fechamento de Agosto; as demais unidades usam Kits × R$ 5,00 (aproveitamento ≥ 40%) ou Kits × R$ 2,50 (aproveitamento < 40%), sem incluir a unidade descontinuada.' : isJulyConsultantCommission ? 'Consultores em Julho: cada kit vale R$ 15,00 na meta da loja ou R$ 7,50 abaixo dela; BYD permanece em R$ 0,00.' : isConsultantCommissionRuleMonth ? 'Consultores: Junho define a faixa de pagamento da loja; Maio usa a mesma referência de Junho. Cada kit vale R$ 15,00 na meta ou R$ 7,50 abaixo dela.' : 'Registro histórico por Competência + Marca + Loja + Gerente, com valores financeiros definidos na regra oficial.'}</p></div><div className="commission-head-actions"><div className="executive-actions"><button className="button secondary" onClick={() => onExportPdf(commissionRows, view, summary)} disabled={!commissionRows.length}><FileDown size={17}/> Exportar PDF</button><button className="button primary" onClick={() => onExportXlsx(commissionRows, view)} disabled={!commissionRows.length}><FileSpreadsheet size={17}/> Exportar Excel</button></div><div className="commission-readonly-note"><ShieldCheck size={19}/><span>Somente consulta<strong>Acesso administrativo</strong></span></div></div></div>
    <CommissionFilterPanel filters={filters} setFilters={setFilters} options={options} monthOptions={monthOptions} onClear={clearFilters} view={view}/>
    <div className="commission-context"><span><BadgeDollarSign size={15}/> {showManagerPerformance ? `${summary.managers.toLocaleString('pt-BR')} gerentes na conferência` : `${filteredCommissionRecords.length.toLocaleString('pt-BR')} registros financeiros na conferência`}</span><span>Operação: {filteredPerformanceRecords.length.toLocaleString('pt-BR')} lançamentos • {summary.passages.toLocaleString('pt-BR')} passagens • {summary.kits.toLocaleString('pt-BR')} kits • {roundedPercent(summary.kits, summary.passages)} aproveitamento</span><span className="context-note">{commissionContextNote}</span></div>
    <div className="commission-tabs" role="tablist" aria-label="Visão de comissões">{tabs.map((tab) => <button type="button" key={tab.key} role="tab" aria-selected={view === tab.key} className={view === tab.key ? 'selected' : ''} onClick={() => changeView(tab.key)}><strong>{tab.label}</strong><small>{tab.detail}</small></button>)}</div>
    <div className={`commission-kpis commission-kpis--${view} ${showManagerPerformance ? 'commission-kpis--manager-performance' : ''}`}>{kpiCards.map((card) => <article className={`commission-kpi ${card.className}`} key={card.label}><span>{card.label}</span><strong className="commission-kpi-value">{card.value}</strong><small>{card.detail}</small></article>)}</div>
    <article className="commission-table-card">
      <div className="panel-title"><div><span>CONFERÊNCIA DE COMISSÕES</span><h3>{view === 'managers' ? 'Conferência de Comissões — Gerentes por Competência' : `${tabs.find((tab) => tab.key === view)?.label} por competência`}</h3><p>{view === 'managers' ? (showManagerPerformance ? 'Junho/2026 consolidado uma única vez por Gerente; suas Marcas e Lojas, Passagens, Kits e comissões permanecem reunidos na mesma linha.' : isJulyManagerCommission ? 'Julho/2026: BYD aparece na conferência com R$ 0,00 e será apurada pelo mês fechado de Agosto; o total considera as demais unidades, exceto a descontinuada.' : 'Acompanhe exclusivamente os pagamentos dos Gerentes. A comissão é lida dos registros financeiros e não usa Passagens, Kits, aproveitamento ou meta como fórmula.') : isJulyConsultantCommission ? 'Julho/2026: os Consultores usam a faixa de aproveitamento consolidada da própria loja em Julho; as unidades BYD permanecem com R$ 0,00 e não entram no total.' : isConsultantCommissionRuleMonth ? 'A comissão de cada Consultor é calculada pelos kits do próprio mês, usando a faixa de aproveitamento consolidada da respectiva loja em Junho/2026; Maio e Junho seguem a mesma regra.' : 'Os registros financeiros preservam Competência, Marca, Loja, responsável, Valor Pago e Data de Pagamento.'}</p></div><BadgeDollarSign size={21}/></div>
      {commissionRows.length ? <div className="commission-table-wrap"><CommissionTable rows={commissionRows} view={view} showManagerPerformance={showManagerPerformance}/></div> : <div className="executive-empty"><BadgeDollarSign size={28}/><h3>Nenhum resultado para os filtros selecionados</h3><p>Altere a competência ou os relacionamentos para consultar a conferência.</p></div>}
    </article>
    <div className="commission-future-note"><CircleHelp size={19}/><div><strong>Histórico financeiro preservado</strong><span>Maio/2026 possui 12 registros de Comissão Fixa Gerente de R$ 1.000,00, totalizando R$ 12.000,00. A Data de Pagamento permanece “Não informada” até ser cadastrada.</span></div></div>
  </section>;
}

function ProtectedApp({ user, profile, unitAccess = [], onProfileRefresh, onSignOut }) {
  const admin = isAdminProfile(profile);
  const manager = isManagerProfile(profile);
  const [records, setRecords] = useState([]);
  const [commissionRecords, setCommissionRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [commissionLoaded, setCommissionLoaded] = useState(false);
  const [catalog, setCatalog] = useState(() => cloneCatalog());
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [remoteCatalog, setRemoteCatalog] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [commissionAccessGranted, setCommissionAccessGranted] = useState(false);
  const [commissionAccessPending, setCommissionAccessPending] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState('');
  const [importData, setImportData] = useState(null);
  const [mapping, setMapping] = useState({ date: '', description: '', consultant: '', passages: '', kits: '' });
  const [importForm, setImportForm] = useState({ brand: '', store: '', consultant: '' });
  const [biFilters, setBiFilters] = useState({ ...EMPTY_FILTERS });
  const [reportFilters, setReportFilters] = useState({ ...EMPTY_REPORT_FILTERS });
  const [selectedUnitKey, setSelectedUnitKey] = useState('');
  const [printingReport, setPrintingReport] = useState(false);
  const [printingCommission, setPrintingCommission] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [updateState, setUpdateState] = useState({ status: window.sensesCar?.updates ? 'idle' : 'unavailable', version: '' });
  const inputRef = useRef(null);

  useEffect(() => {
    Promise.all([loadRecords(), loadCatalog(), loadCommissions()]).then(([items, savedCatalog, savedCommissions]) => {
      const normalizedRecords = applyConsultantCommissionRules(Array.isArray(items)
        ? items.map((item) => ({ ...item, brand: repairMojibake(item.brand), store: repairMojibake(item.store), manager: repairMojibake(item.manager) }))
        : []);
      const normalizedCatalog = normalizeCatalog(savedCatalog);
      setRecords(normalizedRecords);
      setCommissionRecords(mergeCommissionRecords(savedCommissions, normalizedRecords, normalizedCatalog));
      setCatalog(normalizedCatalog);
      setLoaded(true);
      setCommissionLoaded(true);
      setCatalogLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (!admin || !catalogLoaded) return undefined;
    let mounted = true;
    loadRemoteCatalog().then((remote) => {
      if (!mounted) return;
      setRemoteCatalog(remote);
      setCatalog((current) => catalogFromRemote(current, remote));
    }).catch((error) => {
      if (mounted) setToast(`Não foi possível carregar o catálogo do Supabase: ${error.message}`);
    });
    return () => { mounted = false; };
  }, [admin, catalogLoaded]);
  useEffect(() => { if (loaded) saveRecords(records); }, [records, loaded]);
  useEffect(() => { if (commissionLoaded) saveCommissions(commissionRecords); }, [commissionRecords, commissionLoaded]);
  useEffect(() => { if (catalogLoaded) saveCatalog(catalog); }, [catalog, catalogLoaded]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    const updates = window.sensesCar?.updates;
    if (!updates) return undefined;
    let mounted = true;
    const unsubscribe = updates.onStatus?.((nextState) => {
      if (mounted && nextState) setUpdateState(nextState);
    });
    updates.state?.().then((currentState) => {
      if (mounted && currentState) setUpdateState(currentState);
    }).catch(() => {});
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => { if (!admin && ['settings', 'settings-access', 'commissions'].includes(activeView)) setActiveView('overview'); }, [admin, activeView]);
  useEffect(() => {
    const syncCommissionRoute = () => {
      const route = window.location.hash.replace(/^#\/?/, '');
      if (route !== 'commissions') return;
      if (admin) {
        void requestCommissionAccess();
      } else {
        setActiveView('overview');
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    };
    syncCommissionRoute();
    window.addEventListener('hashchange', syncCommissionRoute);
    return () => window.removeEventListener('hashchange', syncCommissionRoute);
  }, [admin]);
  useEffect(() => { if (!admin) setCommissionAccessGranted(false); }, [admin]);

  const manualConsultants = catalog.consultants[form.brand]?.[form.store] || [];
  const importConsultants = catalog.consultants[importForm.brand]?.[importForm.store] || [];
  const importCompetenceDate = importData && mapping.date && importData.rows.length ? toDate(importData.rows[0][mapping.date]) : new Date().toISOString().slice(0, 10);
  const importManager = managerForCompetence(catalog, importForm.brand, importForm.store, importCompetenceDate);
  const manualManager = managerForCompetence(catalog, form.brand, form.store, form.date);
  const allowedUnitKeys = useMemo(() => new Set(unitAccess.map((unit) => accessUnitKey(unit.brandName, unit.storeName))), [unitAccess]);
  const recordsWithHistoricalManagers = useMemo(() => records.map((item) => recordWithHistoricalManager(catalog, item)), [records, catalog]);
  const visibleRecords = useMemo(() => admin ? recordsWithHistoricalManagers : recordsWithHistoricalManagers.filter((item) => allowedUnitKeys.has(unitIdentityKey(item))), [admin, recordsWithHistoricalManagers, allowedUnitKeys]);
  const scopedCatalog = useMemo(() => admin ? catalog : scopeCatalogToStores(catalog, [...allowedUnitKeys]), [admin, catalog, allowedUnitKeys]);
  const manualMetrics = validateManualLaunchMetrics(form.passages, form.kits);
  const manualReady = Boolean(form.brand && form.store && manualManager && form.consultant && manualMetrics.ok);
  const biRows = useMemo(() => visibleRecords.filter((item) => matchesExecutiveFilters(item, biFilters)), [visibleRecords, biFilters]);
  const reportRows = useMemo(() => visibleRecords.filter((item) => matchesExecutiveFilters(item, reportFilters) && (!reportFilters.status || (reportFilters.status === 'on-target' ? isOnTarget(rate(item.kits, item.passages)) : !isOnTarget(rate(item.kits, item.passages))))), [visibleRecords, reportFilters]);
  const biUnits = useMemo(() => aggregateUnits(biRows), [biRows]);
  const rankingUnits = useMemo(() => buildGlobalUnitRanking(visibleRecords, scopedCatalog), [visibleRecords, scopedCatalog]);
  const rankingConsultants = useMemo(() => buildGlobalConsultantRanking(visibleRecords, scopedCatalog), [visibleRecords, scopedCatalog]);
  const biSummary = useMemo(() => totalsForRows(biRows), [biRows]);
  const reportSummary = useMemo(() => totalsForRows(reportRows), [reportRows]);
  const activeUnit = rankingUnits.find((unit) => unit.key === selectedUnitKey) || null;
  const biOptions = filterOptionsFor(biFilters, scopedCatalog, visibleRecords);
  const reportOptions = filterOptionsFor(reportFilters, scopedCatalog, visibleRecords);
  const totals = useMemo(() => totalsForRows(visibleRecords), [visibleRecords]);
  const importTotals = useMemo(() => {
    if (!importData) return { passages: 0, kits: 0 };
    return importData.rows.reduce((acc, row) => ({
      passages: acc.passages + (mapping.passages ? number(row[mapping.passages]) : 0),
      kits: acc.kits + (mapping.kits ? number(row[mapping.kits]) : 0)
    }), { passages: 0, kits: 0 });
  }, [importData, mapping]);
  const importReady = Boolean(importForm.brand && importForm.store && importManager && mapping.passages && mapping.kits && (mapping.consultant || importForm.consultant));
  const importConsultantLabel = mapping.consultant ? 'Consultores da planilha' : (importForm.consultant || '—');
  async function checkForUpdates() {
    const updates = window.sensesCar?.updates;
    if (!updates) return setToast('A busca de atualizações está disponível no aplicativo empacotado.');
    try {
      const result = await updates.check();
      if (result) setUpdateState(result);
    } catch (error) {
      setToast(`Não foi possível buscar atualizações: ${error.message}`);
    }
  }

  async function downloadUpdate() {
    const updates = window.sensesCar?.updates;
    if (!updates) return;
    try {
      const result = await updates.download();
      if (result) setUpdateState(result);
    } catch (error) {
      setToast(`Não foi possível baixar a atualização: ${error.message}`);
    }
  }

  async function installUpdate() {
    const updates = window.sensesCar?.updates;
    if (!updates) return;
    try {
      const result = await updates.install();
      if (result) setUpdateState(result);
    } catch (error) {
      setToast(`Não foi possível instalar a atualização: ${error.message}`);
    }
  }

  function openManual() {
    if (!admin) return;
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setManualOpen(true);
  }

  function addManual(e) {
    e.preventDefault();
    if (!admin) return setToast('Somente administradores podem criar lançamentos.');
    if (!form.brand || !form.store) return setToast('Selecione Marca e Loja antes de continuar.');
    if (!catalog.stores[form.brand]?.includes(form.store)) return setToast('A combinação Marca + Loja não é válida.');
    if (!form.consultant || !manualConsultants.includes(form.consultant)) return setToast('Selecione um Consultor válido para a unidade.');
    const metrics = validateManualLaunchMetrics(form.passages, form.kits);
    if (!metrics.ok) return setToast(metrics.message);
    const { passages, kits } = metrics;
    const record = {
      id: crypto.randomUUID(), brand: form.brand, store: form.store, manager: manualManager,
      consultant: form.consultant, date: form.date, importDate: form.date, importedAt: new Date().toISOString(), description: `${form.brand} • ${form.store}`,
      passages, kits, note: form.note, source: 'Manual', createdAt: new Date().toISOString()
    };
    setRecords((current) => applyConsultantCommissionRules([...current, record]));
    setForm({ ...EMPTY_FORM, date: form.date }); setManualOpen(false); setToast('Dados salvos com sucesso.');
  }

  async function readFile(file) {
    if (!admin) return;
    if (!file) return;
    try {
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) throw new Error('Planilha sem linhas de dados');
      const headers = Object.keys(rows[0]);
      const find = (...terms) => headers.find((h) => terms.some((term) => norm(h).includes(term))) || '';
      setMapping({
        date: find('data', 'date'), description: find('descricao', 'descrição', 'cliente', 'referencia'), consultant: find('consultor', 'nome do premiado', 'nome'),
        passages: find('passagem', 'passagens', 'ticket'), kits: find('kit', 'higienizacao', 'higienização')
      });
      setImportForm({ brand: '', store: '', consultant: '' });
      setImportData({ rows, headers, name: file.name }); setImportOpen(true);
    } catch (error) { setToast(`Não foi possível ler o arquivo: ${error.message}`); }
    finally { if (inputRef.current) inputRef.current.value = ''; }
  }

  function commitImport() {
    if (!admin) return setToast('Somente administradores podem importar arquivos.');
    if (!importForm.brand || !importForm.store) return setToast('Selecione Marca e Loja para concluir a importação.');
    if (!importManager) return setToast('Não foi possível identificar o gerente da unidade.');
    if (!mapping.passages || !mapping.kits) return setToast('Mapeie Passagens e Kits Vendidos para continuar.');
    const consultantsInRows = importData.rows.map((row) => mapping.consultant ? String(row[mapping.consultant] || '').trim() : importForm.consultant).filter(Boolean);
    if (!mapping.consultant && (!importForm.consultant || !importConsultants.includes(importForm.consultant))) return setToast('Selecione um Consultor válido para a importação.');
    if (mapping.consultant && consultantsInRows.length !== importData.rows.length) return setToast('Todas as linhas da planilha precisam informar um Consultor.');
    if (mapping.consultant && consultantsInRows.some((consultant) => !importConsultants.includes(consultant))) return setToast('A planilha contém Consultor(es) fora do cadastro da Marca + Loja selecionadas.');
    const kitsExceedPassages = importData.rows.some((row) => {
      const passages = mapping.passages ? number(row[mapping.passages]) : 0;
      const kits = mapping.kits ? number(row[mapping.kits]) : 0;
      return kits > passages;
    });
    if (kitsExceedPassages) return setToast('A importação contém linha(s) em que Kits Vendidos é maior que Passagens.');
    const now = new Date().toISOString();
    const additions = importData.rows.map((row, index) => {
      const date = mapping.date ? toDate(row[mapping.date]) : now.slice(0, 10);
      return {
        id: crypto.randomUUID(),
        brand: importForm.brand, store: importForm.store, manager: managerForCompetence(catalog, importForm.brand, importForm.store, date), consultant: mapping.consultant ? String(row[mapping.consultant] || '').trim() : importForm.consultant, importDate: now.slice(0, 10), importedAt: now,
        date,
        description: mapping.description ? String(row[mapping.description] || 'Importação de planilha') : 'Importação de planilha',
        passages: mapping.passages ? number(row[mapping.passages]) : 0,
        kits: mapping.kits ? number(row[mapping.kits]) : 0,
        note: `Arquivo: ${importData.name}`,
        source: 'Importação', createdAt: `${now}-${String(index).padStart(6, '0')}`
      };
    }).filter((item) => item.passages || item.kits);
    if (additions.some((item) => !item.manager)) return setToast('Não foi possível identificar o gerente em todas as competências da importação.');
    setRecords((current) => applyConsultantCommissionRules([...current, ...additions]));
    setImportOpen(false); setImportData(null); setImportForm({ brand: '', store: '', consultant: '' }); setToast(`${additions.length} lançamento(s) importado(s).`);
  }

  function exportReportXlsx() {
    if (!reportRows.length) return setToast('Não há registros para exportar com os filtros atuais.');
    try {
      const data = reportRows.map((item) => ({
        'Data da Importação': displayDateTime(item.importedAt, item.importDate || item.date),
        Marca: item.brand || '', Loja: item.store || '', 'Status da Unidade': item.unitStatus || unitStatusFor(item.brand, item.store, item), Gerente: item.manager || '', Consultor: item.consultant || '',
        Passagens: number(item.passages), 'Kits Vendidos': number(item.kits), '% Aproveitamento': roundedPercent(item.kits, item.passages)
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 34 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
      XLSX.writeFile(workbook, `senses-car-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast('Relatório Excel exportado.');
    } catch (error) { setToast(`Não foi possível exportar o Excel: ${error.message}`); }
  }

  async function exportReportPdf() {
    if (!reportRows.length) return setToast('Não há registros para exportar com os filtros atuais.');
    setPrintingReport(true);
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      if (window.sensesCar?.exportPdf) {
        const result = await window.sensesCar.exportPdf();
        if (result?.ok) setToast('Relatório PDF exportado.');
        else if (!result?.canceled) setToast('Exportação PDF cancelada.');
      } else {
        window.print();
        setToast('Use a opção “Salvar como PDF” na impressão.');
      }
    } catch (error) { setToast(`Não foi possível exportar o PDF: ${error.message}`); }
    finally { setPrintingReport(false); }
  }

  function exportCommissionXlsx(rows, view) {
    if (!rows?.length) return setToast('Não há registros para exportar com os filtros atuais.');
    try {
      const showManagerPerformance = view === 'managers' && rows.every((row) => row.hasPerformance && row.competence === JUNE_MANAGER_COMMISSION_COMPETENCE);
      const data = rows.map((row) => {
        if (showManagerPerformance) return { Marca: row.brand || '', Loja: row.store || '', 'Status da Unidade': row.unitStatus || UNIT_STATUS_ACTIVE, Gerente: row.manager || '', Passagens: number(row.passages), Kits: number(row.kits), '% Aproveitamento': roundedPercent(row.kits, row.passages), Comissão: row.commission ?? 0, 'Data de Pagamento': paymentDateLabel(row.paymentDate) };
        if (view === 'managers') return { Marca: row.brand || '', Loja: row.store || '', 'Status da Unidade': row.unitStatus || UNIT_STATUS_ACTIVE, Gerente: row.manager || '', Competência: row.period, 'Valor Pago': row.commission ?? '', 'Data de Pagamento': paymentDateLabel(row.paymentDate) };
        if (view === 'consultants') return { Marca: row.brand || '', Loja: row.store || '', 'Status da Unidade': row.unitStatus || UNIT_STATUS_ACTIVE, Consultor: row.consultant || '', Competência: row.period, 'Valor Pago': row.commission ?? '', 'Data de Pagamento': paymentDateLabel(row.paymentDate) };
        return { Marca: row.brand || '', Loja: row.store || '', 'Status da Unidade': row.unitStatus || UNIT_STATUS_ACTIVE, Gerente: row.manager || '', Consultor: row.consultant || '', Competência: row.period, 'Valor Pago': row.commission ?? '', 'Data de Pagamento': paymentDateLabel(row.paymentDate) };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = showManagerPerformance
        ? [{ wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 19 }, { wch: 18 }, { wch: 22 }]
        : view === 'managers'
        ? [{ wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 32 }, { wch: 22 }, { wch: 18 }, { wch: 22 }]
        : view === 'consultants'
          ? [{ wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 22 }]
          : [{ wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 30 }, { wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 22 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Comissões');
      XLSX.writeFile(workbook, `senses-car-comissoes-${view}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast('Comissões Excel exportadas.');
    } catch (error) { setToast(`Não foi possível exportar as Comissões em Excel: ${error.message}`); }
  }

  async function exportCommissionPdf(rows, view, summary) {
    if (!rows?.length) return setToast('Não há registros para exportar com os filtros atuais.');
    setPrintingCommission({ rows, view, summary });
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      if (window.sensesCar?.exportPdf) {
        const result = await window.sensesCar.exportPdf();
        if (result?.ok) setToast('Comissões PDF exportadas.');
        else if (!result?.canceled) setToast('Exportação PDF cancelada.');
      } else {
        window.print();
        setToast('Use a opção “Salvar como PDF” na impressão.');
      }
    } catch (error) { setToast(`Não foi possível exportar as Comissões em PDF: ${error.message}`); }
    finally { setPrintingCommission(null); }
  }

  async function saveCatalogEntry(entry) {
    if (!admin) return false;
    const result = createCatalogEntry(catalog, entry);
    if (!result.ok) { setToast(result.message); return false; }

    if (entry.type === 'brand' || entry.type === 'store') {
      if (!remoteCatalog) {
        setToast('O catálogo do Supabase ainda está carregando. Tente novamente.');
        return false;
      }
      if (entry.type === 'brand') {
        const { data, error } = await supabase.from('brands').insert({ name: String(entry.value).trim() }).select('id, name, is_active, created_at, updated_at').single();
        if (error) { setToast(error.message || 'Não foi possível salvar a Marca no Supabase.'); return false; }
        const nextRemote = { ...remoteCatalog, brands: [...remoteCatalog.brands, data] };
        setRemoteCatalog(nextRemote);
        setCatalog(catalogFromRemote(result.catalog, nextRemote));
      } else {
        const brand = remoteCatalog.brands.find((item) => norm(item.name) === norm(entry.brand));
        if (!brand) { setToast('A Marca selecionada não existe no catálogo do Supabase.'); return false; }
        const { data, error } = await supabase.from('stores').insert({ brand_id: brand.id, name: String(entry.value).trim() }).select('id, brand_id, name, is_active, created_at, updated_at').single();
        if (error) { setToast(error.message || 'Não foi possível salvar a Loja no Supabase.'); return false; }
        const nextRemote = { ...remoteCatalog, stores: [...remoteCatalog.stores, data] };
        setRemoteCatalog(nextRemote);
        setCatalog(catalogFromRemote(result.catalog, nextRemote));
      }
    } else {
      setCatalog(result.catalog);
    }
    setToast(result.message);
    return true;
  }

  async function archiveCatalogEntry(entry) {
    if (entry.type === 'brand' || entry.type === 'store') {
      if (!remoteCatalog) {
        setToast('O catálogo do Supabase ainda está carregando. Tente novamente.');
        return false;
      }
      if (entry.type === 'brand') {
        const brand = remoteCatalog.brands.find((item) => norm(item.name) === norm(entry.brand));
        if (!brand) { setToast('A Marca selecionada não existe no catálogo do Supabase.'); return false; }
        const { error: brandError } = await supabase.from('brands').update({ is_active: false }).eq('id', brand.id);
        if (brandError) { setToast(brandError.message || 'Não foi possível arquivar a Marca.'); return false; }
        const { error: storesError } = await supabase.from('stores').update({ is_active: false }).eq('brand_id', brand.id);
        if (storesError) { setToast(storesError.message || 'Não foi possível arquivar as Lojas da Marca.'); return false; }
        const nextRemote = { ...remoteCatalog, brands: remoteCatalog.brands.map((item) => item.id === brand.id ? { ...item, is_active: false } : item), stores: remoteCatalog.stores.map((item) => item.brand_id === brand.id ? { ...item, is_active: false } : item) };
        setRemoteCatalog(nextRemote);
        setCatalog(catalogFromRemote(removeCatalogEntry(catalog, entry), nextRemote));
      } else {
        const brand = remoteCatalog.brands.find((item) => norm(item.name) === norm(entry.brand));
        const store = remoteCatalog.stores.find((item) => brand && item.brand_id === brand.id && norm(item.name) === norm(entry.store));
        if (!store) { setToast('A Loja selecionada não existe no catálogo do Supabase.'); return false; }
        const { error } = await supabase.from('stores').update({ is_active: false }).eq('id', store.id);
        if (error) { setToast(error.message || 'Não foi possível arquivar a Loja.'); return false; }
        const nextRemote = { ...remoteCatalog, stores: remoteCatalog.stores.map((item) => item.id === store.id ? { ...item, is_active: false } : item) };
        setRemoteCatalog(nextRemote);
        setCatalog(catalogFromRemote(removeCatalogEntry(catalog, entry), nextRemote));
      }
      return true;
    }
    setCatalog((current) => removeCatalogEntry(current, entry));
    return true;
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    if (!admin) {
      setPendingDelete(null);
      return;
    }
    if (pendingDelete.kind === 'record') {
      setRecords((current) => current.filter((item) => item.id !== pendingDelete.id));
      setToast('Lançamento excluído do histórico local.');
    } else {
      const archived = await archiveCatalogEntry(pendingDelete);
      if (!archived) return;
      setToast(`${pendingDelete.label} removido do catálogo ativo.`);
    }
    setPendingDelete(null);
  }

  async function requestCommissionAccess() {
    if (!admin) {
      setToast('A tela Comissões é exclusiva para administradores.');
      return false;
    }
    if (commissionAccessGranted) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/commissions`);
      setActiveView('commissions');
      return true;
    }
    if (commissionAccessPending) return false;
    setCommissionAccessPending(true);
    setToast('Validando o acesso administrativo à tela Comissões...');
    const { data, error } = await supabase.rpc('can_view_commissions');
    if (error || data !== true) {
      setCommissionAccessPending(false);
      setActiveView('overview');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      setToast(error ? 'Não foi possível validar o acesso à tela Comissões.' : 'A tela Comissões é exclusiva para administradores.');
      return false;
    }
    setCommissionAccessGranted(true);
    setCommissionAccessPending(false);
    setToast('');
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/commissions`);
    setActiveView('commissions');
    return true;
  }

  function navigateTo(view) {
    if (view === 'commissions') {
      void requestCommissionAccess();
      return;
    } else if (window.location.hash === '#/commissions') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    setActiveView(view);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><SensesLogo alt="Senses Car • Tecnologia no Ar"/><span>CONTROLE OPERACIONAL</span></div>
      <nav>
        <button className={activeView === 'overview' ? 'nav-active' : ''} onClick={() => navigateTo('overview')}><Sparkles size={19}/> Visão geral</button>
        <button className={activeView === 'reports' ? 'nav-active' : ''} onClick={() => navigateTo('reports')}><FileText size={19}/> Relatórios</button>
        <button className={activeView === 'dashboard' ? 'nav-active' : ''} onClick={() => navigateTo('dashboard')}><Gauge size={19}/> Dashboard BI</button>
        <button className={activeView === 'ranking' ? 'nav-active' : ''} onClick={() => navigateTo('ranking')}><Medal size={19}/> Ranking</button>
        {admin && <button className={activeView === 'commissions' ? 'nav-active' : ''} onClick={() => navigateTo('commissions')}><BadgeDollarSign size={19}/> Comissões</button>}
        {admin && <button className={activeView.startsWith('settings') ? 'nav-active' : ''} onClick={() => navigateTo('settings')}><Settings size={19}/> Configurações</button>}
        {admin && <button onClick={openManual}><Plus size={19}/> Novo lançamento</button>}
        {admin && <button onClick={() => inputRef.current?.click()}><Upload size={19}/> Importar arquivo</button>}
      </nav>
      <div className="sidebar-note"><ShieldCheck size={20}/><div><strong>Dados protegidos</strong><span>Registros salvos neste computador.</span></div></div>
       <div className="auth-user-card"><span className="auth-user-card__label">SESSÃO ATIVA</span><strong>{user?.email || 'Usuário autenticado'}</strong><small>{admin ? 'Administrador' : manager ? `Gerente · ${unitAccess.length} loja(s)` : 'Acesso ativo'}</small><button type="button" onClick={onSignOut}><LogOut size={15}/> Sair</button></div>
      <div className="sidebar-footer"><CircleHelp size={18}/><span>Versão 1.0 • Offline</span></div>
    </aside>

    <main className={`main-view main-${activeView}`}>
       <header className="topbar">
         <div><span className="kicker">PAINEL DE CONTROLE</span><h1>{activeView === 'overview' ? 'Visão Geral' : activeView === 'reports' ? 'Relatórios' : activeView === 'dashboard' ? 'Dashboard BI' : activeView === 'ranking' ? 'Ranking Geral' : activeView === 'commissions' ? 'Comissões' : activeView === 'settings-access' ? 'Controle de Acessos' : 'Configurações'}</h1><p>{activeView === 'overview' ? 'Acompanhe passagens e kits de higienização em um só lugar.' : activeView === 'reports' ? 'Gere relatórios filtrados para análises e apresentações executivas.' : activeView === 'dashboard' ? 'Acompanhe indicadores e evolução da meta de aproveitamento.' : activeView === 'ranking' ? 'Visualize o desempenho geral das unidades e filtre o período por mês.' : activeView === 'commissions' ? 'Acompanhe performance e comissionamento por Gerente e Consultor.' : activeView === 'settings-access' ? 'Administre perfis e destine visibilidade por Marca + Loja.' : 'Administre os cadastros oficiais e a manutenção dos dados locais.'}</p></div>
         <UpdateCenter state={updateState} onCheck={checkForUpdates} onDownload={downloadUpdate} onInstall={installUpdate} />
       </header>

      {activeView === 'overview' && <OverviewHero totals={totals} />}

      {activeView === 'reports' && <ReportsPanel rows={reportRows} filters={reportFilters} setFilters={setReportFilters} options={reportOptions} summary={reportSummary} onBack={() => setActiveView('overview')} onExportXlsx={exportReportXlsx} onExportPdf={exportReportPdf} onDeleteRecord={admin ? (item) => setPendingDelete({ kind: 'record', id: item.id, label: `Lançamento ${item.brand || 'sem marca'} • ${item.store || 'sem loja'}`, detail: 'O registro selecionado será removido do histórico local e dos indicadores.' }) : undefined} />}
      {activeView === 'dashboard' && <DashboardPanel rows={biRows} units={biUnits} rankingUnits={rankingUnits} rankingConsultants={rankingConsultants} totals={biSummary} filters={biFilters} setFilters={setBiFilters} options={biOptions} selectedUnit={activeUnit} onSelectUnit={(unit) => setSelectedUnitKey(unit?.key || '')} onBack={() => setActiveView('overview')} showRanking={false} />}
      {activeView === 'ranking' && <RankingPanel records={visibleRecords} catalog={scopedCatalog} onBack={() => navigateTo('overview')} />}
      {activeView === 'commissions' && admin && commissionAccessGranted && <CommissionsPanel records={visibleRecords} commissionRecords={commissionRecords} catalog={scopedCatalog} onBack={() => navigateTo('overview')} onExportXlsx={exportCommissionXlsx} onExportPdf={exportCommissionPdf} />}
      {activeView === 'settings-access' && admin && <AdminAccessPanel profile={profile} onProfileRefresh={onProfileRefresh} onBack={() => setActiveView('settings')} />}
      {activeView === 'settings' && admin && <SettingsPanel catalog={catalog} onBack={() => setActiveView('overview')} onSaveEntry={saveCatalogEntry} onRequestDelete={setPendingDelete} onOpenAccess={() => setActiveView('settings-access')} />}

    </main>

    <input ref={inputRef} hidden type="file" accept=".csv,.xlsx,.xls" onChange={(e) => readFile(e.target.files?.[0])}/>

    {admin && manualOpen && <Modal wide title="Novo lançamento" subtitle="Selecione a marca e a loja para registrar os dados de vendas." onClose={() => setManualOpen(false)}>
      <form onSubmit={addManual} className="form launch-form">
        <div className="filter-panel filter-panel-embedded manual-brand-panel"><div className="filter-section-label"><span>Marca <b className="required-mark">*</b></span><small>Selecione a identidade da montadora</small></div><BrandCards brands={catalog.brands} value={form.brand} onChange={(value) => setForm({ ...form, brand: value, store: '', consultant: '', passages: '', kits: '' })} /></div>
        <div className="filter-grid form-filter-grid"><label className="filter-field"><span>Loja <b className="required-mark">*</b></span><select required disabled={!form.brand} value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value, consultant: '', passages: '', kits: '' })}><option value="">{form.brand ? 'Selecione uma loja' : 'Selecione a marca primeiro'}</option>{(catalog.stores[form.brand] || []).map((store) => <option key={store} value={store}>{store}</option>)}</select><ChevronDown size={14}/></label><label className="filter-field"><span>Gerente responsável</span><input className="manager-field" value={manualManager} placeholder="Preenchido automaticamente" readOnly disabled={!manualManager}/></label><label className="filter-field"><span>Consultor <b className="required-mark">*</b></span><select required disabled={!form.store} value={form.consultant} onChange={(e) => setForm({ ...form, consultant: e.target.value, passages: '', kits: '' })}><option value="">{form.store ? (manualConsultants.length ? 'Selecione um consultor' : 'Nenhum consultor cadastrado') : 'Selecione a loja primeiro'}</option>{manualConsultants.map((consultant) => <option key={consultant} value={consultant}>{consultant}</option>)}</select><ChevronDown size={14}/></label></div>
        <div className="form-grid"><label><span>Passagens <b className="required-mark">*</b></span><input required type="number" min="0" step="1" inputMode="numeric" pattern="[0-9]*" disabled={!form.consultant} value={form.passages} onChange={(e) => setForm({ ...form, passages: e.target.value.replace(/\D/g, '') })} placeholder="0"/></label><label><span>Kits Vendidos <b className="required-mark">*</b></span><input required type="number" min="0" step="1" inputMode="numeric" pattern="[0-9]*" disabled={!form.consultant} value={form.kits} onChange={(e) => setForm({ ...form, kits: e.target.value.replace(/\D/g, '') })} placeholder="0"/></label></div>
        {manualReady && <div className="manual-summary"><strong>Resumo para conferência</strong><div><span>Marca</span><b>{form.brand}</b><span>Loja</span><b>{form.store}</b><span>Gerente</span><b>{manualManager}</b><span>Consultor</span><b>{form.consultant}</b><span>Passagens</span><b>{Number(form.passages).toLocaleString('pt-BR')}</b><span>Kits Vendidos</span><b>{Number(form.kits).toLocaleString('pt-BR')}</b><span>Parcial de Aproveitamento</span><b>{percent(form.kits, form.passages)}</b></div></div>}
        <label><span>Data do lançamento</span><input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label>
        <label><span>Observação <em>opcional</em></span><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Informações complementares"/></label>
        <footer><button type="button" className="button secondary" onClick={() => setManualOpen(false)}>Cancelar</button><button className="button primary" disabled={!manualReady}><Check size={18}/> CONCLUIR</button></footer>
      </form>
    </Modal>}

    {admin && importOpen && importData && <Modal wide title="Conferir importação" subtitle={`${importData.name} • ${importData.rows.length} linhas encontradas`} onClose={() => setImportOpen(false)}>
      <div className="mapping import-mapping"><div className="page-banner mini"><div><span>IMPORTAÇÃO • FLUXO DE DADOS</span><strong>Conecte movimento e performance.</strong></div></div><p>Selecione Marca, Loja e Consultor para vincular os dados e identificar automaticamente o Gerente. Depois relacione as colunas da planilha.</p>
      <div className="filter-panel filter-panel-embedded import-brand-panel"><div className="filter-section-label"><span>Marca <b className="required-mark">*</b></span><small>Selecione a identidade da montadora</small></div><BrandCards brands={catalog.brands} value={importForm.brand} onChange={(value) => setImportForm({ brand: value, store: '', consultant: '' })}/><div className="filter-grid form-filter-grid"><label className="filter-field"><span>Loja <b className="required-mark">*</b></span><select required disabled={!importForm.brand} value={importForm.store} onChange={(e) => setImportForm({ ...importForm, store: e.target.value, consultant: '' })}><option value="">{importForm.brand ? 'Selecione uma loja' : 'Selecione a marca primeiro'}</option>{(catalog.stores[importForm.brand] || []).map((store) => <option key={store} value={store}>{store}</option>)}</select><ChevronDown size={14}/></label><label className="filter-field"><span>Gerente responsável</span><input className="manager-field" value={importManager} placeholder="Preenchido automaticamente" readOnly disabled={!importManager}/></label></div></div>
      <div className="filter-panel filter-panel-embedded mapping-grid import-mapping-fields"><label><span>Consultor <b className="required-mark">*</b></span><select required disabled={!importForm.store || Boolean(mapping.consultant)} value={importForm.consultant} onChange={(e) => setImportForm({ ...importForm, consultant: e.target.value })}><option value="">{mapping.consultant ? 'Usando a coluna da planilha' : (importForm.store ? 'Selecione um consultor' : 'Selecione a loja primeiro')}</option>{importConsultants.map((consultant) => <option key={consultant} value={consultant}>{consultant}</option>)}</select></label><label><span>Data</span><select value={mapping.date} onChange={(e) => setMapping({...mapping,date:e.target.value})}><option value="">Data atual</option>{importData.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label><span>Descrição</span><select value={mapping.description} onChange={(e) => setMapping({...mapping,description:e.target.value})}><option value="">Não importar</option>{importData.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label><span>Consultor na planilha</span><select value={mapping.consultant} onChange={(e) => setMapping({...mapping,consultant:e.target.value})}><option value="">Usar seleção acima</option>{importData.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label><span>Passagens <b className="required-mark">*</b></span><select value={mapping.passages} onChange={(e) => setMapping({...mapping,passages:e.target.value})}><option value="">Não importar</option>{importData.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label><span>Kits Vendidos <b className="required-mark">*</b></span><select value={mapping.kits} onChange={(e) => setMapping({...mapping,kits:e.target.value})}><option value="">Não importar</option>{importData.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label></div>
      <div className="import-summary"><div><span>Marca</span><strong>{importForm.brand || '—'}</strong></div><div><span>Loja</span><strong>{importForm.store || '—'}</strong></div><div><span>Gerente</span><strong>{importManager || '—'}</strong></div><div><span>Consultor</span><strong>{importConsultantLabel}</strong></div><div><span>Passagens</span><strong>{importTotals.passages.toLocaleString('pt-BR')}</strong></div><div><span>Kits Vendidos</span><strong>{importTotals.kits.toLocaleString('pt-BR')}</strong></div><div><span>Parcial de Aproveitamento</span><strong>{percent(importTotals.kits, importTotals.passages)}</strong></div></div>
      <div className="preview"><strong>Prévia das primeiras linhas</strong><div className="preview-grid">{importData.rows.slice(0,3).map((row,i)=><div key={i}><span>{mapping.date ? displayDate(toDate(row[mapping.date])) : 'Data atual'}</span><b>{mapping.description ? String(row[mapping.description] || 'Sem descrição') : `${importForm.brand || 'Marca'} • ${importForm.store || 'Loja'}`}</b><span>{mapping.passages ? number(row[mapping.passages]) : 0} passagens • {mapping.kits ? number(row[mapping.kits]) : 0} kits</span></div>)}</div></div>
      <footer><button className="button secondary" onClick={() => setImportOpen(false)}>Cancelar</button><button className="button primary" disabled={!importReady} onClick={commitImport}><Upload size={18}/> Concluir Importação</button></footer></div>
    </Modal>}

    {pendingDelete && <Modal title="Confirmar exclusão" subtitle="Esta ação precisa de confirmação antes de continuar." onClose={() => setPendingDelete(null)}>
      <div className="delete-confirmation"><div className="delete-confirmation-icon"><Trash2 size={24}/></div><strong>{pendingDelete.label}</strong><p>{pendingDelete.detail}</p></div>
      <footer className="confirm-footer"><button type="button" className="button secondary" onClick={() => setPendingDelete(null)}>Cancelar</button><button type="button" className="button danger" onClick={confirmPendingDelete}><Trash2 size={17}/> Excluir definitivamente</button></footer>
    </Modal>}

    {printingReport && <PrintReport rows={reportRows} filters={reportFilters} summary={reportSummary} />}
    {printingCommission && <PrintCommission rows={printingCommission.rows} view={printingCommission.view} summary={printingCommission.summary} />}

    {toast && <div className="toast"><Check size={18}/>{toast}</div>}
  </div>;
}

export default function App() {
  return (
    <AuthGate>
      {({ user, profile, unitAccess, onProfileRefresh, signOut }) => <ProtectedApp user={user} profile={profile} unitAccess={unitAccess} onProfileRefresh={onProfileRefresh} onSignOut={signOut} />}
    </AuthGate>
  );
}
