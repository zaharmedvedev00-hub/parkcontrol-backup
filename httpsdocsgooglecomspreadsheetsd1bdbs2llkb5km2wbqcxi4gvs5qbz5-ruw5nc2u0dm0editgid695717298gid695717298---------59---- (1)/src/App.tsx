import { useEffect, useMemo, useRef, useState } from 'react'
import {
  seedProductNames,
  seedRecipientNames,
  seedVehicles,
} from './data/seeds'

type Tab = 'dashboard' | 'vehicles' | 'products' | 'directory' | 'parts' | 'movements' | 'analytics' | 'registries' | 'purchase'
type VehicleType = 'Трактор' | 'Комбайн' | 'Погрузчик' | 'Грузовик' | 'Опрыскиватель' | 'Автомобиль' | 'Другое'
type VehicleStatus = 'active' | 'maintenance' | 'repair'
type MovementType = 'receipt' | 'issue' | 'adjustment'
type Unit = '' | 'л' | 'кг' | 'шт'

interface Vehicle {
  id: string
  name: string
  plate: string
  type: VehicleType
  department: string
  responsible: string
  status: VehicleStatus
  serviceIntervalDays?: number
  serviceIntervalRunHours?: number
  serviceRunHoursUnit?: '' | 'м/ч' | 'км'
  notes: string
  createdAt: string
}

interface Product {
  id: string
  name: string
  category: string
  unit: Unit
  packSize: number
  minStock: number
  price: number
  notes: string
}

interface Movement {
  id: string
  date: string
  type: MovementType
  productId: string
  quantity: number
  vehicleId?: string
  counterparty: string
  documentNo: string
  purpose: string
  note: string
  runHours: string
  unitPrice?: number
  createdAt?: string
}

interface VehicleDraft {
  name: string
  plate: string
  type: VehicleType
  department: string
  responsible: string
  status: VehicleStatus
  serviceIntervalDays: string
  serviceIntervalRunHours: string
  serviceRunHoursUnit: '' | 'м/ч' | 'км'
  notes: string
}

interface ProductDraft {
  name: string
  category: string
  unit: Unit
  packSize: string
  minStock: string
  price: string
  notes: string
}

interface MovementDraft {
  date: string
  type: MovementType
  productId: string
  quantity: string
  unitPrice: string
  vehicleId: string
  counterparty: string
  documentNo: string
  purposeKind: string
  purposeSystem: string
  purpose: string
  note: string
  runHours: string
}

interface ReceiptLineDraft {
  id: string
  productId: string
  quantity: string
  unitPrice: string
}

interface IssueLineDraft {
  id: string
  productId: string
  quantity: string
}

type RegistryStatus = 'new' | 'inspection' | 'repair' | 'closed'
type InspectionStage = 'inspection' | 'observation' | 'repair' | 'closed'
type MaintenanceState = 'ok' | 'soon' | 'overdue' | 'unknown'
type VehicleSystem = 'engine' | 'hydraulic' | 'transmission' | 'cooling' | 'grease' | 'brake' | 'other'

interface RegistryCase {
  vehicleId: string
  status: RegistryStatus
  owner: string
  note: string
  updatedAt: string
}

interface InspectionRecord {
  id: string
  vehicleId: string
  date: string
  stage: InspectionStage
  mechanic: string
  finding: string
  action: string
  recommendation: string
  createdAt: string
}

interface InspectionDraft {
  date: string
  stage: InspectionStage
  mechanic: string
  finding: string
  action: string
  recommendation: string
}

type ContactKind = 'person' | 'supplier'

interface Contact {
  id: string
  name: string
  kind: ContactKind
  position: string
  phone: string
  note: string
}

interface ContactDraft {
  name: string
  kind: ContactKind
  position: string
  phone: string
  note: string
}

const STORAGE_KEYS = {
  vehicles: 'oil-accounting:vehicles',
  products: 'oil-accounting:products',
  movements: 'oil-accounting:movements',
  contacts: 'oil-accounting:contacts',
  planningDays: 'oil-accounting:planning-days',
  registryCases: 'oil-accounting:registry-cases',
  inspectionRecords: 'oil-accounting:inspection-records',
}

const LEGACY_STORAGE_KEYS: Record<keyof typeof STORAGE_KEYS, string[]> = {
  vehicles: ['oil-accounting-v7-clean:vehicles'],
  products: ['oil-accounting-v7-clean:products'],
  movements: ['oil-accounting-v7-clean:movements'],
  contacts: ['oil-accounting-v7-clean:contacts'],
  planningDays: ['oil-accounting-v7-clean:planning-days'],
  registryCases: ['oil-accounting-v7-clean:registry-cases'],
  inspectionRecords: ['oil-accounting-v7-clean:inspection-records'],
}

const VEHICLE_TYPES: VehicleType[] = ['Трактор', 'Комбайн', 'Погрузчик', 'Грузовик', 'Опрыскиватель', 'Автомобиль', 'Другое']

const VEHICLE_STATUSES: { value: VehicleStatus; label: string }[] = [
  { value: 'active', label: 'В работе' },
  { value: 'maintenance', label: 'На ТО' },
  { value: 'repair', label: 'В ремонте' },
]

const VEHICLE_EDITABLE_STATUSES: { value: VehicleStatus; label: string }[] = [
  { value: 'active', label: 'В работе' },
  { value: 'maintenance', label: 'На ТО' },
]

function buildSeedContacts(): Contact[] {
  return Array.from(new Set(seedRecipientNames.map((item) => item.trim()).filter(Boolean))).map((name, index) => ({
    id: `seed-contact-${index + 1}`,
    name,
    kind: 'person',
    position: '',
    phone: '',
    note: '',
  }))
}

function inferVehicleType(name: string): VehicleType {
  const lower = name.toLowerCase()
  if (lower.includes('камаз') || lower.includes('газ ') || lower.startsWith('газ') || lower.includes('iveco') || lower.includes('маз')) return 'Грузовик'
  if (lower.includes('lada') || lower.includes('ваз') || lower.includes('niva')) return 'Автомобиль'
  if (lower.includes('комбайн') || lower.includes('полесье') || lower.includes('tucano') || lower.includes('macdon')) return 'Комбайн'
  if (lower.includes('jcb') || lower.includes('sany') || lower.includes('погруз')) return 'Погрузчик'
  if (lower.includes('туман') || lower.includes('mitsuber')) return 'Опрыскиватель'
  if (lower.includes('мтз') || lower.includes('беларус') || lower.includes('johndeere') || lower.includes('john deere') || lower.includes('fendt') || lower.includes('к-701') || lower.includes('т-150') || lower.includes('lovol') || lower.includes('дт-75') || lower.includes('т-170') || lower.includes('бульдозер')) return 'Трактор'
  return 'Другое'
}

function inferProductCategory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('фильтр') || lower.includes('ремень') || lower.includes('подшип') || lower.includes('сальник') || lower.includes('шина') || lower.includes('камера')) return 'Запчасти'
  if (lower.includes('тосол') || lower.includes('антифриз') || lower.includes('felix')) return 'Охлаждающие жидкости'
  if (lower.includes('росдот') || lower.includes('торм')) return 'Тормозные жидкости'
  if (lower.includes('литол') || lower.includes('смазка')) return 'Смазки'
  if (lower.includes('гейзер')) return 'Гидравлические масла'
  if (lower.includes('gl-') || lower.includes('тэп') || lower.includes('тад') || lower.includes('verso') || lower.includes('80w') || lower.includes('85w')) return 'Трансмиссионные масла'
  if (lower.includes('чистик') || lower.includes('паста')) return 'Химия и сервис'
  if (lower.includes('15w') || lower.includes('10w') || lower.includes('sae 40') || lower.includes('sae 30') || lower.includes('мотор')) return 'Моторные масла'
  return 'Другое'
}

function isSparePart(product: Product): boolean {
  const source = `${product.name} ${product.category}`.toLowerCase()
  return /запчаст|фильтр|ремень|подшип|сальник|шина|камера|ступиц|амортиз|ролик|проклад/.test(source)
}

function inferUnit(name: string): Unit {
  const lower = name.toLowerCase()
  if (lower.includes('кг') || lower.includes('ведро') || lower.includes('смазка') || lower.includes('паста')) return 'кг'
  if (lower.includes('шт') || lower.includes('фильтр')) return 'шт'
  return 'л'
}

function inferPackSize(name: string, unit: Unit): number {
  const normalized = name.replace(',', '.')
  const literMatch = normalized.match(/(\d+(?:\.\d+)?)\s*л/i)
  const kgMatch = normalized.match(/(\d+(?:\.\d+)?)\s*кг/i)
  const mlMatch = normalized.match(/(\d+(?:\.\d+)?)\s*мл/i)

  if (unit === 'л') {
    if (literMatch) return Number(literMatch[1])
    if (mlMatch) return Number(mlMatch[1]) / 1000
    return 200
  }

  if (unit === 'кг') {
    if (kgMatch) return Number(kgMatch[1])
    if (mlMatch) return Number(mlMatch[1]) / 1000
    return 10
  }

  return 1
}

function encodeBase64Url(value: string): string {
  const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, p1: string) => String.fromCharCode(parseInt(p1, 16)))
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(base64)
  const percentEncoded = Array.from(binary)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('')
  return decodeURIComponent(percentEncoded)
}

function stripRepairComment(value: string): string {
  return value.replace(/требуется\s*рэ/gi, '').trim()
}

function sanitizeVehiclesNotes(items: Vehicle[]): Vehicle[] {
  return items.map((item) => ({
    ...item,
    status:
      (item.status as string) === 'repair' || (item.status as string) === 'reserve'
        ? 'active'
        : item.status,
    notes: stripRepairComment(item.notes ?? ''),
  }))
}

function buildSeedVehicles(): Vehicle[] {
  return seedVehicles.map((item, index) => {
    const plateMatch = item.label.match(/[А-ЯA-Z0-9]{1,4}\s?[А-ЯA-Z]{0,2}\s?\d{2,3}$/iu)
    const plate = plateMatch?.[0]?.trim() ?? ''

    const type = inferVehicleType(item.label)
    return {
      id: `seed-vehicle-${index + 1}`,
      name: item.label,
      plate,
      type,
      department: '',
      responsible: item.responsible ?? '',
      status: 'active',
      serviceIntervalDays: MAINTENANCE_INTERVAL_DAYS_BY_TYPE[type],
      serviceIntervalRunHours: MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[type],
      serviceRunHoursUnit: type === 'Грузовик' || type === 'Автомобиль' ? 'км' : 'м/ч',
      notes: stripRepairComment(item.note ?? ''),
      createdAt: new Date().toISOString(),
    }
  })
}

function buildSeedProducts(): Product[] {
  return seedProductNames.map((name, index) => {
    const unit = inferUnit(name)
    return {
      id: `seed-product-${index + 1}`,
      name,
      category: inferProductCategory(name),
      unit,
      packSize: inferPackSize(name, unit),
      minStock: 0,
      price: 0,
      notes: '',
    }
  })
}

function buildSeedMovements(): Movement[] {
  return []
}

const emptyVehicleDraft = (): VehicleDraft => ({
  name: '',
  plate: '',
  type: 'Трактор',
  department: '',
  responsible: '',
  status: 'active',
  serviceIntervalDays: String(MAINTENANCE_INTERVAL_DAYS_BY_TYPE['Трактор']),
  serviceIntervalRunHours: String(MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE['Трактор']),
  serviceRunHoursUnit: 'м/ч',
  notes: '',
})

const emptyProductDraft = (): ProductDraft => ({
  name: '',
  category: '',
  unit: '',
  packSize: '',
  minStock: '',
  price: '',
  notes: '',
})

const today = () => new Date().toISOString().slice(0, 10)

const emptyMovementDraft = (productId = ''): MovementDraft => ({
  date: today(),
  type: 'issue',
  productId,
  quantity: '',
  unitPrice: '',
  vehicleId: '',
  counterparty: '',
  documentNo: '',
  purposeKind: 'ТО',
  purposeSystem: 'Двигатель',
  purpose: 'ТО · Двигатель',
  note: '',
  runHours: '',
})

const emptyReceiptLine = (productId = ''): ReceiptLineDraft => ({
  id: uid(),
  productId,
  quantity: '',
  unitPrice: '',
})

const emptyIssueLine = (productId = ''): IssueLineDraft => ({
  id: uid(),
  productId,
  quantity: '',
})

const emptyInspectionDraft = (): InspectionDraft => ({
  date: today(),
  stage: 'inspection',
  mechanic: '',
  finding: '',
  action: '',
  recommendation: '',
})

const emptyContactDraft = (): ContactDraft => ({
  name: '',
  kind: 'person',
  position: '',
  phone: '',
  note: '',
})

const CONTACT_POSITION_OPTIONS = [
  'Механизатор',
  'Водитель',
  'Тракторист',
  'Комбайнер',
  'Инженер',
  'Механик',
  'Заведующий складом',
  'Кладовщик',
  'Руководитель подразделения',
  'Другое',
] as const

const REGISTRY_STATUS_OPTIONS: { value: RegistryStatus; label: string }[] = [
  { value: 'new', label: 'Не проверено' },
  { value: 'inspection', label: 'На осмотре' },
  { value: 'repair', label: 'В ремонте' },
  { value: 'closed', label: 'Закрыто' },
]

const INSPECTION_STAGE_OPTIONS: { value: InspectionStage; label: string }[] = [
  { value: 'inspection', label: 'Осмотр' },
  { value: 'observation', label: 'Наблюдение' },
  { value: 'repair', label: 'Ремонт' },
  { value: 'closed', label: 'Закрытие случая' },
]

const MAINTENANCE_INTERVAL_DAYS_BY_TYPE: Record<VehicleType, number> = {
  'Трактор': 45,
  'Комбайн': 30,
  'Погрузчик': 35,
  'Грузовик': 40,
  'Опрыскиватель': 30,
  'Автомобиль': 60,
  'Другое': 45,
}

const MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE: Record<VehicleType, number> = {
  'Трактор': 250,
  'Комбайн': 180,
  'Погрузчик': 220,
  'Грузовик': 10000,
  'Опрыскиватель': 160,
  'Автомобиль': 12000,
  'Другое': 200,
}

const MOVEMENT_PURPOSE_KIND_OPTIONS = [
  'ТО',
  'Долив',
  'Ремонт',
  'Диагностика',
  'Консервация',
  'Общий расход',
] as const

const MOVEMENT_PURPOSE_SYSTEM_OPTIONS = [
  'Двигатель',
  'Гидравлика',
  'Трансмиссия',
  'Редуктор',
  'Коробка',
  'Охлаждение',
  'Тормозная система',
  'Смазка',
  'Другое',
] as const

const NORMAL_TOPUP_LIMITS_BY_TYPE: Record<VehicleType, Partial<Record<VehicleSystem, number>>> = {
  'Трактор': { engine: 10, hydraulic: 15, transmission: 8, cooling: 8, grease: 5, brake: 2 },
  'Комбайн': { engine: 12, hydraulic: 18, transmission: 10, cooling: 10, grease: 6, brake: 2 },
  'Погрузчик': { engine: 8, hydraulic: 20, transmission: 8, cooling: 6, grease: 4, brake: 2 },
  'Грузовик': { engine: 6, hydraulic: 10, transmission: 6, cooling: 6, grease: 3, brake: 2 },
  'Опрыскиватель': { engine: 6, hydraulic: 12, transmission: 6, cooling: 6, grease: 3, brake: 2 },
  'Автомобиль': { engine: 4, hydraulic: 0, transmission: 4, cooling: 4, grease: 2, brake: 1 },
  'Другое': { engine: 6, hydraulic: 10, transmission: 6, cooling: 6, grease: 3, brake: 1 },
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function useStoredState<T>(key: string, initialValue: T | (() => T), legacyKeys: string[] = []) {
  const [state, setState] = useState<T>(() => {
    const fallback = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T

      for (const legacyKey of legacyKeys) {
        const legacyRaw = window.localStorage.getItem(legacyKey)
        if (!legacyRaw) continue
        const parsed = JSON.parse(legacyRaw) as T
        window.localStorage.setItem(key, JSON.stringify(parsed))
        return parsed
      }

      return fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState] as const
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)
}

function movementSignedQuantity(movement: Movement) {
  if (movement.type === 'issue') return -Math.abs(movement.quantity)
  if (movement.type === 'receipt') return Math.abs(movement.quantity)
  return movement.quantity
}

function composeMovementPurpose(kind: string, system: string, fallback = 'Расход') {
  const cleanKind = kind.trim()
  const cleanSystem = system.trim()
  if (!cleanKind && !cleanSystem) return fallback
  if (!cleanSystem) return cleanKind || fallback
  if (!cleanKind) return cleanSystem || fallback
  return `${cleanKind} · ${cleanSystem}`
}

function splitMovementPurpose(value: string) {
  const [kindRaw = '', systemRaw = ''] = value.split('·').map((part) => part.trim())
  const kind = kindRaw || 'ТО'
  const system = systemRaw || 'Двигатель'
  return { kind, system }
}

function isWithinDays(dateString: string, days: number) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return false
  const compare = new Date()
  compare.setHours(0, 0, 0, 0)
  compare.setDate(compare.getDate() - days)
  return date >= compare
}

function isBetweenDays(dateString: string, fromDays: number, toDays: number) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return false

  const latest = new Date()
  latest.setHours(23, 59, 59, 999)
  latest.setDate(latest.getDate() - fromDays)

  const earliest = new Date()
  earliest.setHours(0, 0, 0, 0)
  earliest.setDate(earliest.getDate() - toDays)

  return date <= latest && date >= earliest
}

function parseDateValue(dateString: string) {
  const normalized = /^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(dateString)
    ? (() => {
        const [d, m, y] = dateString.split('.')
        const year = y ? (y.length === 2 ? `20${y}` : y) : String(new Date().getFullYear())
        return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      })()
    : dateString

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function compareOptionalDateDesc(left?: string, right?: string) {
  const leftTime = left ? parseDateValue(left)?.getTime() ?? Number.NEGATIVE_INFINITY : Number.NEGATIVE_INFINITY
  const rightTime = right ? parseDateValue(right)?.getTime() ?? Number.NEGATIVE_INFINITY : Number.NEGATIVE_INFINITY
  return rightTime - leftTime
}

function compareMovementOrderDesc(left: Movement, right: Movement) {
  const dateCompare = compareOptionalDateDesc(left.date, right.date)
  if (dateCompare !== 0) return dateCompare

  const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : Number.NEGATIVE_INFINITY
  const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : Number.NEGATIVE_INFINITY
  if (leftCreated !== rightCreated) return rightCreated - leftCreated

  return left.id < right.id ? 1 : -1
}

function inferVehicleSystem(product?: Product | null, text = ''): VehicleSystem {
  const source = `${product?.name ?? ''} ${product?.category ?? ''} ${text}`.toLowerCase()
  if (/торм|росдот/.test(source)) return 'brake'
  if (/тосол|антифриз|охлажд|felix/.test(source)) return 'cooling'
  if (/литол|смазк|grease|termolit/.test(source)) return 'grease'
  if (/гейзер|гидр|hlp/.test(source)) return 'hydraulic'
  if (/gl-|тэп|тад|80w|85w|verso|короб|редукт|мост|трансм/.test(source)) return 'transmission'
  if (/15w|10w|sae 40|sae 30|мотор|двиг/.test(source)) return 'engine'
  return 'other'
}

function vehicleSystemLabel(system: VehicleSystem) {
  switch (system) {
    case 'engine': return 'Двигатель'
    case 'hydraulic': return 'Гидравлика'
    case 'transmission': return 'Трансмиссия'
    case 'cooling': return 'Охлаждение'
    case 'grease': return 'Смазка'
    case 'brake': return 'Тормозная система'
    default: return 'Прочее'
  }
}

function parseRunHoursValue(value?: string) {
  if (!value) return null
  const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function detectRunHoursUnit(value?: string) {
  const normalized = (value ?? '').toLowerCase()
  if (!normalized) return ''
  if (normalized.includes('км')) return 'км'
  if (normalized.includes('м/ч') || normalized.includes('мч') || normalized.includes('моточас')) return 'м/ч'
  return ''
}

function addDays(dateString: string, days: number) {
  const parsed = parseDateValue(dateString)
  if (!parsed) return ''
  const next = new Date(parsed)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function maintenanceStateByDate(nextDate: string, baseDate: Date): MaintenanceState {
  const next = parseDateValue(nextDate)
  if (!next) return 'unknown'
  const diff = (next.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'soon'
  return 'ok'
}

function isWithinDaysFrom(dateString: string, days: number, baseDate: Date) {
  const date = parseDateValue(dateString)
  if (!date) return false
  const compare = new Date(baseDate)
  compare.setHours(0, 0, 0, 0)
  compare.setDate(compare.getDate() - days)
  return date >= compare && date <= baseDate
}

function isBetweenDaysFrom(dateString: string, fromDays: number, toDays: number, baseDate: Date) {
  const date = parseDateValue(dateString)
  if (!date) return false

  const latest = new Date(baseDate)
  latest.setHours(23, 59, 59, 999)
  latest.setDate(latest.getDate() - fromDays)

  const earliest = new Date(baseDate)
  earliest.setHours(0, 0, 0, 0)
  earliest.setDate(earliest.getDate() - toDays)

  return date <= latest && date >= earliest
}

function glass(extra = '') {
  return `rounded-[30px] border border-slate-200/85 bg-white/56 shadow-[0_24px_80px_rgba(91,156,255,0.14),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-[34px] ${extra}`
}

function App() {
  const [vehicles, setVehicles] = useStoredState<Vehicle[]>(STORAGE_KEYS.vehicles, buildSeedVehicles, LEGACY_STORAGE_KEYS.vehicles)
  const [products, setProducts] = useStoredState<Product[]>(STORAGE_KEYS.products, buildSeedProducts, LEGACY_STORAGE_KEYS.products)
  const [movements, setMovements] = useStoredState<Movement[]>(STORAGE_KEYS.movements, buildSeedMovements, LEGACY_STORAGE_KEYS.movements)
  const [contacts, setContacts] = useStoredState<Contact[]>(STORAGE_KEYS.contacts, buildSeedContacts, LEGACY_STORAGE_KEYS.contacts)
  const [planningDays, setPlanningDays] = useStoredState<number>(STORAGE_KEYS.planningDays, 30, LEGACY_STORAGE_KEYS.planningDays)
  const [registryCases, setRegistryCases] = useStoredState<RegistryCase[]>(STORAGE_KEYS.registryCases, [], LEGACY_STORAGE_KEYS.registryCases)
  const [inspectionRecords, setInspectionRecords] = useStoredState<InspectionRecord[]>(STORAGE_KEYS.inspectionRecords, [], LEGACY_STORAGE_KEYS.inspectionRecords)

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [notice, setNotice] = useState('Система готова к работе.')

  const [vehicleForm, setVehicleForm] = useState<VehicleDraft>(emptyVehicleDraft)
  const [productForm, setProductForm] = useState<ProductDraft>(emptyProductDraft)
  const [contactForm, setContactForm] = useState<ContactDraft>(emptyContactDraft)
  const [movementForm, setMovementForm] = useState<MovementDraft>(() => emptyMovementDraft(buildSeedProducts()[0]?.id ?? ''))
  const [receiptLines, setReceiptLines] = useState<ReceiptLineDraft[]>(() => [emptyReceiptLine(buildSeedProducts()[0]?.id ?? '')])
  const [issueLines, setIssueLines] = useState<IssueLineDraft[]>(() => [emptyIssueLine(buildSeedProducts()[0]?.id ?? '')])
  const [inspectionForm, setInspectionForm] = useState<InspectionDraft>(emptyInspectionDraft)

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [expandedVehicleProductId, setExpandedVehicleProductId] = useState<string | null>(null)
  const [expandedVehiclePurpose, setExpandedVehiclePurpose] = useState<string | null>(null)
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [isVehicleDetailsOpen, setIsVehicleDetailsOpen] = useState(false)
  const [reopenVehicleDetailsAfterVehicleModal, setReopenVehicleDetailsAfterVehicleModal] = useState(false)
  const [dashboardStatusModal, setDashboardStatusModal] = useState<VehicleStatus | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isMovementFormOpen, setIsMovementFormOpen] = useState(false)

  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | VehicleType>('all')
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'all' | VehicleStatus>('all')
  const [productSearch, setProductSearch] = useState('')
  const [partSearch, setPartSearch] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [contactKindFilter, setContactKindFilter] = useState<'all' | ContactKind>('all')

  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | MovementType>('all')
  const [movementProductFilter, setMovementProductFilter] = useState('all')
  const [movementVehicleFilter, setMovementVehicleFilter] = useState('all')
  const [movementDateFilter, setMovementDateFilter] = useState('')
  const [movementSortOrder, setMovementSortOrder] = useState<'desc' | 'asc'>('desc')
  const [registrySearch, setRegistrySearch] = useState('')
  const [registryKindFilter, setRegistryKindFilter] = useState<'all' | 'noData' | 'maintenance' | 'risk' | 'topUp'>('all')
  const [registryStatusFilter, setRegistryStatusFilter] = useState<'all' | RegistryStatus>('all')
  const [registryPriorityFilter, setRegistryPriorityFilter] = useState<'all' | 'critical' | 'warning' | 'watch' | 'normal'>('all')
  const hasImportedLinkSnapshot = useRef(false)
  

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hasImportedLinkSnapshot.current) return

    const hash = window.location.hash
    if (!hash.startsWith('#data=')) return

    const encoded = hash.slice('#data='.length)
    if (!encoded) return

    hasImportedLinkSnapshot.current = true
    try {
      const decoded = decodeBase64Url(encoded)
      const parsed = JSON.parse(decoded) as {
        vehicles?: Vehicle[]
        products?: Product[]
        movements?: Movement[]
        contacts?: Contact[]
        planningDays?: number
        registryCases?: RegistryCase[]
        inspectionRecords?: InspectionRecord[]
      }

      const shouldReplace = window.confirm('Загрузить данные из ссылки? Текущие локальные данные будут заменены.')
      if (!shouldReplace) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
        return
      }

      if (Array.isArray(parsed.vehicles)) setVehicles(sanitizeVehiclesNotes(parsed.vehicles))
      if (Array.isArray(parsed.products)) setProducts(parsed.products)
      if (Array.isArray(parsed.movements)) setMovements(parsed.movements)
      if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts)
      if (typeof parsed.planningDays === 'number') setPlanningDays(parsed.planningDays)
      if (Array.isArray(parsed.registryCases)) setRegistryCases(parsed.registryCases)
      if (Array.isArray(parsed.inspectionRecords)) setInspectionRecords(parsed.inspectionRecords)

      setNotice('Данные из ссылки загружены.')
    } catch {
      setNotice('Не удалось загрузить данные из ссылки.')
    } finally {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }, [setVehicles, setProducts, setMovements, setContacts, setPlanningDays, setRegistryCases, setInspectionRecords])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    setVehicles((current) => {
      let changed = false
      const next = current.map((item) => {
        const cleanedNotes = stripRepairComment(item.notes ?? '')
        const normalizedStatus =
          (item.status as string) === 'repair' || (item.status as string) === 'reserve'
            ? 'active'
            : item.status
        if (cleanedNotes !== (item.notes ?? '') || normalizedStatus !== item.status) {
          changed = true
          return { ...item, notes: cleanedNotes, status: normalizedStatus }
        }
        return item
      })
      return changed ? next : current
    })
  }, [setVehicles])

  useEffect(() => {
    // Keep backward compatibility with older local data where contact position did not exist.
    setContacts((current) => {
      let changed = false
      const next = current.map((contact) => {
        const normalizedPosition = typeof contact.position === 'string' ? contact.position : ''
        if (normalizedPosition !== contact.position) {
          changed = true
          return { ...contact, position: normalizedPosition }
        }
        return contact
      })
      return changed ? next : current
    })
  }, [setContacts])

  useEffect(() => {
    // Keep directory complete: every responsible person and counterparty becomes editable in one place.
    const people = new Set<string>()
    const suppliers = new Set<string>()

    vehicles.forEach((vehicle) => {
      const name = vehicle.responsible.trim()
      if (name) people.add(name)
    })

    movements.forEach((movement) => {
      const name = movement.counterparty.trim()
      if (!name) return
      if (movement.type === 'receipt') suppliers.add(name)
      else people.add(name)
    })

    setContacts((current) => {
      const byKey = new Map(current.map((item) => [`${item.kind}:${item.name.toLowerCase()}`, item]))
      let changed = false
      const next = [...current]

      people.forEach((name) => {
        const key = `person:${name.toLowerCase()}`
        if (!byKey.has(key)) {
          changed = true
          next.push({ id: uid(), name, kind: 'person', position: '', phone: '', note: '' })
        }
      })

      suppliers.forEach((name) => {
        const key = `supplier:${name.toLowerCase()}`
        if (!byKey.has(key)) {
          changed = true
          next.push({ id: uid(), name, kind: 'supplier', position: '', phone: '', note: '' })
        }
      })

      return changed ? next : current
    })
  }, [movements, vehicles, setContacts])

  useEffect(() => {
    setExpandedVehicleProductId(null)
    setExpandedVehiclePurpose(null)
  }, [selectedVehicleId, isVehicleDetailsOpen])

  useEffect(() => {
    // Prevent stacked overlays: edit dialogs should always sit as the active layer.
    if ((isVehicleModalOpen || isProductModalOpen) && isVehicleDetailsOpen) {
      setIsVehicleDetailsOpen(false)
    }
  }, [isVehicleModalOpen, isProductModalOpen, isVehicleDetailsOpen])

  useEffect(() => {
    if (movementForm.type === 'issue') {
      const normalized = composeMovementPurpose(movementForm.purposeKind, movementForm.purposeSystem, 'Расход')
      if (movementForm.purpose !== normalized) {
        setMovementForm((prev) => ({ ...prev, purpose: normalized }))
      }
      return
    }

    if (movementForm.type === 'receipt' && movementForm.purpose !== 'Приход') {
      setMovementForm((prev) => ({ ...prev, purpose: 'Приход', purposeKind: 'Приход', purposeSystem: '' }))
      return
    }

    if (movementForm.type === 'adjustment' && movementForm.purpose === 'Приход') {
      setMovementForm((prev) => ({ ...prev, purpose: 'Корректировка', purposeKind: 'Корректировка', purposeSystem: '' }))
    }
  }, [movementForm.type, movementForm.purposeKind, movementForm.purposeSystem, movementForm.purpose])

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const vehicleMap = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles])

  const peopleNames = useMemo(
    () => Array.from(new Set(contacts.filter((item) => item.kind === 'person').map((item) => item.name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    [contacts],
  )

  const supplierNames = useMemo(
    () => Array.from(new Set(contacts.filter((item) => item.kind === 'supplier').map((item) => item.name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    [contacts],
  )

  const allRecipientNames = useMemo(
    () => Array.from(new Set([...peopleNames, ...supplierNames])).sort((a, b) => a.localeCompare(b, 'ru')),
    [peopleNames, supplierNames],
  )

  const analyticsBaseDate = useMemo(() => {
    const parsedDates = movements
      .map((movement) => parseDateValue(movement.date))
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())
    return parsedDates[0] ?? new Date()
  }, [movements])

  const stockByProduct = useMemo(() => {
    const result: Record<string, number> = {}
    products.forEach((product) => {
      result[product.id] = 0
    })
    movements.forEach((movement) => {
      result[movement.productId] = (result[movement.productId] ?? 0) + movementSignedQuantity(movement)
    })
    return result
  }, [movements, products])

  const availableProductsForOutflow = useMemo(
    () => products.filter((product) => (stockByProduct[product.id] ?? 0) > 0),
    [products, stockByProduct],
  )

  useEffect(() => {
    if (products.length === 0) {
      setMovementForm((prev) => ({ ...prev, productId: '' }))
      setReceiptLines([emptyReceiptLine('')])
      return
    }

    const sourceProducts = movementForm.type === 'receipt' ? products : availableProductsForOutflow
    const fallbackProductId = sourceProducts[0]?.id ?? ''

    if (!sourceProducts.some((product) => product.id === movementForm.productId)) {
      setMovementForm((prev) => ({ ...prev, productId: fallbackProductId }))
    }

    if (movementForm.type === 'receipt') {
      setReceiptLines((current) => {
        const normalized = current
          .filter((line) => !line.productId || products.some((product) => product.id === line.productId))
          .map((line) => ({ ...line, productId: line.productId || fallbackProductId }))
        return normalized.length ? normalized : [emptyReceiptLine(fallbackProductId)]
      })
      return
    }

    if (movementForm.type === 'issue') {
      setIssueLines((current) => {
        const normalized = current
          .filter((line) => !line.productId || availableProductsForOutflow.some((product) => product.id === line.productId))
          .map((line) => ({ ...line, productId: line.productId || fallbackProductId }))
        return normalized.length ? normalized : [emptyIssueLine(fallbackProductId)]
      })
    }
  }, [availableProductsForOutflow, movementForm.productId, movementForm.type, products])

  const issuesAllTime = useMemo(
    () => movements.filter((movement) => movement.type === 'issue'),
    [movements],
  )

  const issuesLast30 = useMemo(
    () => movements.filter((movement) => movement.type === 'issue' && isWithinDaysFrom(movement.date, 30, analyticsBaseDate)),
    [analyticsBaseDate, movements],
  )

  const issuesLast90 = useMemo(
    () => movements.filter((movement) => movement.type === 'issue' && isWithinDaysFrom(movement.date, 90, analyticsBaseDate)),
    [analyticsBaseDate, movements],
  )

  const issuesPrev30 = useMemo(
    () => movements.filter((movement) => movement.type === 'issue' && isBetweenDaysFrom(movement.date, 31, 60, analyticsBaseDate)),
    [analyticsBaseDate, movements],
  )

  const vehicleLastToDateMap = useMemo(() => {
    const result = new Map<string, string>()
    vehicles.forEach((vehicle) => {
      const latestTo = movements
        .filter((movement) => movement.vehicleId === vehicle.id && movement.type === 'issue' && /\bто\b|замен/i.test(`${movement.purpose} ${movement.note}`))
        .sort((a, b) => compareOptionalDateDesc(a.date, b.date))[0]
      if (latestTo?.date) result.set(vehicle.id, latestTo.date)
    })
    return result
  }, [movements, vehicles])

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((vehicle) => {
        const query = vehicleSearch.trim().toLowerCase()
        const matchesQuery = !query || [vehicle.name, vehicle.plate, vehicle.responsible, vehicle.department, vehicle.notes].join(' ').toLowerCase().includes(query)
        const matchesType = vehicleTypeFilter === 'all' || vehicle.type === vehicleTypeFilter
        const matchesStatus = vehicleStatusFilter === 'all' || vehicle.status === vehicleStatusFilter
        return matchesQuery && matchesType && matchesStatus
      })
      .sort((a, b) => {
        const byToDate = compareOptionalDateDesc(vehicleLastToDateMap.get(a.id), vehicleLastToDateMap.get(b.id))
        if (byToDate !== 0) return byToDate
        return a.name.localeCompare(b.name, 'ru')
      })
  }, [vehicles, vehicleSearch, vehicleTypeFilter, vehicleStatusFilter, vehicleLastToDateMap])

  const filteredMovements = useMemo(() => {
    return [...movements]
      .filter((movement) => (movementTypeFilter === 'all' ? true : movement.type === movementTypeFilter))
      .filter((movement) => (movementProductFilter === 'all' ? true : movement.productId === movementProductFilter))
      .filter((movement) => (movementVehicleFilter === 'all' ? true : movement.vehicleId === movementVehicleFilter))
      .filter((movement) => (movementDateFilter ? movement.date === movementDateFilter : true))
      .sort((a, b) => {
        const compare = compareMovementOrderDesc(a, b)
        return movementSortOrder === 'desc' ? compare : -compare
      })
  }, [movementDateFilter, movementProductFilter, movementSortOrder, movementTypeFilter, movementVehicleFilter, movements])

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase()
    return products.filter((product) => {
      if (!query) return true
      return [product.name, product.category, product.notes].join(' ').toLowerCase().includes(query)
    })
  }, [productSearch, products])

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase()
    return contacts
      .filter((contact) => {
        const matchesKind = contactKindFilter === 'all' || contact.kind === contactKindFilter
        const matchesQuery = !query || [contact.name, contact.position, contact.phone, contact.note].join(' ').toLowerCase().includes(query)
        return matchesKind && matchesQuery
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [contactKindFilter, contactSearch, contacts])

  const sparePartProducts = useMemo(
    () => products.filter((product) => isSparePart(product)),
    [products],
  )

  const filteredSparePartRows = useMemo(() => {
    const query = partSearch.trim().toLowerCase()
    return sparePartProducts
      .map((product) => {
        const issueMovements = movements
          .filter((movement) => movement.productId === product.id && movement.type === 'issue')
          .sort((a, b) => compareMovementOrderDesc(a, b))
        const current = stockByProduct[product.id] ?? 0
        const last30Issue = issuesLast30
          .filter((movement) => movement.productId === product.id)
          .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
        const issueLast90 = issuesLast90
          .filter((movement) => movement.productId === product.id)
          .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
        const opsLast30 = issuesLast30.filter((movement) => movement.productId === product.id).length
        const opsLast90 = issuesLast90.filter((movement) => movement.productId === product.id).length
        const totalOps = issueMovements.length
        const avgIntervalDays = (() => {
          if (issueMovements.length < 2) return null
          const sortedDates = issueMovements
            .map((movement) => parseDateValue(movement.date)?.getTime() ?? null)
            .filter((value): value is number => value !== null)
            .sort((a, b) => b - a)
          if (sortedDates.length < 2) return null
          let gapSum = 0
          for (let i = 0; i < sortedDates.length - 1; i += 1) {
            gapSum += Math.max(1, Math.round((sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24)))
          }
          return gapSum / (sortedDates.length - 1)
        })()
        const forecast30 = issueLast90 > 0 ? (issueLast90 / 90) * 30 : last30Issue
        const linkedVehiclesCount = new Set(
          movements
            .filter((movement) => movement.productId === product.id && movement.type === 'issue' && movement.vehicleId)
            .map((movement) => movement.vehicleId),
        ).size
        const popularityScore =
          opsLast30 * 3 +
          linkedVehiclesCount * 1.5 +
          Math.min(last30Issue, 80) / 8 +
          (opsLast90 >= 6 ? 2 : 0)
        const isPopular =
          opsLast30 >= 3 ||
          (linkedVehiclesCount >= 2 && opsLast30 >= 2) ||
          opsLast90 >= 6 ||
          (last30Issue > 0 && forecast30 >= Math.max(1, product.minStock * 0.6))

        return {
          product,
          current,
          last30Issue,
          issueLast90,
          opsLast30,
          opsLast90,
          totalOps,
          avgIntervalDays,
          forecast30,
          linkedVehiclesCount,
          popularityScore,
          isPopular,
          lowStock: current <= product.minStock,
        }
      })
      .filter((row) => {
        if (!query) return true
        return [row.product.name, row.product.category, row.product.notes].join(' ').toLowerCase().includes(query)
      })
      .sort((a, b) => {
        if (Number(b.isPopular) !== Number(a.isPopular)) return Number(b.isPopular) - Number(a.isPopular)
        if (Number(b.lowStock) !== Number(a.lowStock)) return Number(b.lowStock) - Number(a.lowStock)
        if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore
        if (b.last30Issue !== a.last30Issue) return b.last30Issue - a.last30Issue
        return a.product.name.localeCompare(b.product.name, 'ru')
      })
  }, [issuesLast30, issuesLast90, movements, partSearch, sparePartProducts, stockByProduct])

  const popularSparePartRows = useMemo(
    () => filteredSparePartRows
      .filter((row) => row.isPopular)
      .sort((a, b) => {
        if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore
        if (b.opsLast30 !== a.opsLast30) return b.opsLast30 - a.opsLast30
        return b.last30Issue - a.last30Issue
      }),
    [filteredSparePartRows],
  )

  const analyticsRows = useMemo(() => {
    return products.map((product) => {
      const current = stockByProduct[product.id] ?? 0
      const last30 = issuesLast30.filter((movement) => movement.productId === product.id).reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const prev30 = issuesPrev30.filter((movement) => movement.productId === product.id).reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const dailyRate = planningDays > 0 ? last30 / planningDays : 0
      const forecast = dailyRate * planningDays
      const shortage = Math.max(0, forecast + product.minStock - current)
      const packsToBuy = product.packSize > 0 ? Math.ceil(shortage / product.packSize) : 0
      const purchaseQty = packsToBuy * product.packSize
      const anomaly = prev30 > 0 && last30 > prev30 * 1.5
      return { product, current, last30, prev30, forecast, shortage, packsToBuy, purchaseQty, anomaly }
    })
  }, [issuesLast30, issuesPrev30, planningDays, products, stockByProduct])

  const buildVehicleRiskRows = (
    currentIssues: Movement[],
    compareIssues: Movement[],
    labelCurrent: string,
    labelCompare: string,
  ) => {
    const baseRows = vehicles.map((vehicle) => {
      const currentPeriod = currentIssues.filter((movement) => movement.vehicleId === vehicle.id)
      const comparePeriod = compareIssues.filter((movement) => movement.vehicleId === vehicle.id)
      const currentQty = currentPeriod.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const compareQty = comparePeriod.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const serviceQty = currentPeriod
        .filter((movement) => /долив|гидр|короб|редукт|тосол|охлажд|резерв|утеч/i.test(`${movement.purpose} ${movement.note}`))
        .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const plannedReplacementMovements = currentPeriod.filter((movement) => /\bто\b|замен/i.test(`${movement.purpose} ${movement.note}`))
      const plannedReplacementQty = plannedReplacementMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const plannedReplacementOps = plannedReplacementMovements.length
      const topUpMovements = currentPeriod.filter((movement) => /долив/i.test(movement.purpose) || /долив/i.test(movement.note))
      const topUpOps = topUpMovements.length
      const topUpQty = topUpMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const maxTopUpQty = topUpMovements.reduce((max, movement) => Math.max(max, Math.abs(movement.quantity)), 0)
      const emergencyTopUpMovements = topUpMovements.filter((movement) => Math.abs(movement.quantity) > 15)
      const emergencyTopUpOps = emergencyTopUpMovements.length
      const emergencyTopUpQty = emergencyTopUpMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const smallTopUpMovements = topUpMovements.filter((movement) => Math.abs(movement.quantity) > 0 && Math.abs(movement.quantity) <= 15)
      const smallTopUpOps = smallTopUpMovements.length
      const smallTopUpQty = smallTopUpMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      const maxSingleIssueQty = currentPeriod.reduce((max, movement) => Math.max(max, Math.abs(movement.quantity)), 0)
      const reserveOps = currentPeriod.filter((movement) => /резерв/i.test(movement.purpose) || /резерв/i.test(movement.note)).length
      const productKinds = new Set(currentPeriod.map((movement) => movement.productId)).size
      const lastIssueDate = [...currentPeriod].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.date ?? ''
      return {
        vehicle,
        currentPeriod,
        comparePeriod,
        currentQty,
        compareQty,
        serviceQty,
        plannedReplacementOps,
        plannedReplacementQty,
        topUpOps,
        topUpQty,
        maxTopUpQty,
        emergencyTopUpOps,
        emergencyTopUpQty,
        smallTopUpOps,
        smallTopUpQty,
        maxSingleIssueQty,
        reserveOps,
        productKinds,
        operations: currentPeriod.length,
        lastIssueDate,
      }
    })

    const typeAverageMap = new Map<VehicleType, number>()
    VEHICLE_TYPES.forEach((type) => {
      const peerRows = baseRows.filter((row) => row.vehicle.type === type && (row.currentQty > 0 || row.compareQty > 0))
      const avg = peerRows.length ? peerRows.reduce((sum, row) => sum + row.currentQty, 0) / peerRows.length : 0
      typeAverageMap.set(type, avg)
    })

    return baseRows
      .map((row) => {
        const typeAverage = typeAverageMap.get(row.vehicle.type) ?? 0
        const growthFactor = row.compareQty > 0 ? row.currentQty / row.compareQty : row.currentQty > 0 ? 999 : 1
        const typeFactor = typeAverage > 0 ? row.currentQty / typeAverage : row.currentQty > 0 ? 999 : 1
        const reasons: string[] = []
        let score = 0

        const nonPlannedQty = Math.max(0, row.currentQty - row.plannedReplacementQty)

        if (nonPlannedQty >= 80 && row.plannedReplacementQty < row.currentQty * 0.7) {
          score += 2
          reasons.push(`большой неплановый расход ${labelCurrent.toLowerCase()}`)
        }
        if (typeAverage > 0 && nonPlannedQty > typeAverage * 1.6 && nonPlannedQty - typeAverage >= 15) {
          score += 3
          reasons.push('неплановый расход выше среднего по типу техники')
        }
        if (row.compareQty > 0 && growthFactor >= 1.5 && row.currentQty - row.compareQty >= 15) {
          score += 3
          reasons.push(`рост относительно периода «${labelCompare}»`)
        }
        if (row.plannedReplacementOps >= 1 && row.plannedReplacementQty >= Math.max(20, row.currentQty * 0.45)) {
          reasons.push('есть крупные плановые замены по ТО')
        }
        if (row.serviceQty >= Math.max(20, row.currentQty * 0.4) && row.smallTopUpOps >= 2) {
          score += 2
          reasons.push('много небольших доливов на фоне сервисных расходов')
        }
        if (row.smallTopUpOps >= 3) {
          score += 3
          reasons.push('частые небольшие доливы')
        }
        if (row.smallTopUpOps >= 5) {
          score += 2
          reasons.push('малые доливы повторяются слишком часто')
        }
        if (row.smallTopUpQty >= 20) {
          score += 2
          reasons.push('большой суммарный объем малых доливов')
        }
        if (row.emergencyTopUpOps >= 1 && row.smallTopUpOps >= 2) {
          score += 2
          reasons.push('аварийный долив после серии малых доливов')
        }
        if (row.emergencyTopUpQty >= 40) {
          score += 2
          reasons.push('крупный аварийный долив')
        }
        if (row.maxTopUpQty >= 50 && row.smallTopUpOps >= 1) {
          score += 2
          reasons.push('крупный долив после повторных обращений')
        }
        if (row.operations >= 5 && nonPlannedQty >= 40) {
          score += 1
          reasons.push('частые обращения за маслами')
        }
        if (row.productKinds >= 3 && nonPlannedQty >= 35) {
          score += 1
          reasons.push('несколько видов масел за короткий период')
        }
        if (row.vehicle.status === 'repair' || row.vehicle.status === 'maintenance') {
          score += 1
          reasons.push('машина уже помечена как проблемная')
        }

        const recommendation =
          score >= 7
            ? 'Срочно проверить технику: утечки, гидросистему, двигатель и регламент ТО.'
            : score >= 4
              ? 'Назначить осмотр и сверить фактический расход с нормой.'
              : score >= 2
                ? 'Поставить на наблюдение и проверить при ближайшем ТО.'
                : 'Явных признаков перерасхода не видно.'

        return {
          ...row,
          typeAverage,
          growthFactor,
          typeFactor,
          score,
          reasons,
          recommendation,
          severity: score >= 7 ? 'critical' : score >= 4 ? 'warning' : score >= 2 ? 'watch' : 'normal',
          labelCurrent,
          labelCompare,
          last30: row.currentPeriod,
          prev30: row.comparePeriod,
          last30Qty: row.currentQty,
          prev30Qty: row.compareQty,
        }
      })
      .filter((row) => row.currentQty > 0 || row.compareQty > 0)
      .sort((a, b) => (b.score === a.score ? b.currentQty - a.currentQty : b.score - a.score))
  }

  const vehicleRiskRowsRecent = useMemo(
    () => buildVehicleRiskRows(issuesLast30, issuesPrev30, 'за последние 30 дней', 'предыдущие 30 дней'),
    [issuesLast30, issuesPrev30, vehicles],
  )

  const olderHistoryIssues = useMemo(
    () => issuesAllTime.filter((movement) => !issuesLast30.some((recent) => recent.id === movement.id)),
    [issuesAllTime, issuesLast30],
  )

  const vehicleRiskRowsAllTime = useMemo(
    () => buildVehicleRiskRows(issuesAllTime, olderHistoryIssues, 'за всю историю', 'ранняя история'),
    [issuesAllTime, olderHistoryIssues, vehicles],
  )

  const [problemSortMode, setProblemSortMode] = useState<'recent' | 'allTime'>('recent')

  const vehicleRiskRows = problemSortMode === 'allTime' ? vehicleRiskRowsAllTime : vehicleRiskRowsRecent

  const criticalRepairCandidates = useMemo(
    () =>
      vehicleRiskRows.filter((row) => {
        const hasGeneralAnomaly =
          row.emergencyTopUpOps > 0 ||
          row.emergencyTopUpQty >= 20 ||
          row.currentQty >= Math.max(40, row.plannedReplacementQty + 20) ||
          (row.compareQty > 0 && row.currentQty - row.compareQty >= 20) ||
          row.productKinds >= 3 ||
          row.reserveOps >= 2 ||
          row.operations >= 5

        const onlySmallTopUpsSignal =
          row.smallTopUpOps >= 2 &&
          row.emergencyTopUpOps === 0 &&
          row.currentQty <= row.plannedReplacementQty + row.smallTopUpQty + 10 &&
          row.productKinds <= 2 &&
          row.operations <= 4

        return row.score >= 4 && hasGeneralAnomaly && !onlySmallTopUpsSignal
      }),
    [vehicleRiskRows],
  )

  const plannedReplacementLeaders = useMemo(
    () => [...vehicleRiskRows].filter((row) => row.plannedReplacementQty > 0).sort((a, b) => (b.plannedReplacementQty === a.plannedReplacementQty ? b.plannedReplacementOps - a.plannedReplacementOps : b.plannedReplacementQty - a.plannedReplacementQty)).slice(0, 5),
    [vehicleRiskRows],
  )

  const emergencyTopUpLeaders = useMemo(
    () => [...vehicleRiskRows].filter((row) => row.emergencyTopUpQty > 0).sort((a, b) => (b.emergencyTopUpQty === a.emergencyTopUpQty ? b.emergencyTopUpOps - a.emergencyTopUpOps : b.emergencyTopUpQty - a.emergencyTopUpQty)).slice(0, 5),
    [vehicleRiskRows],
  )

  const smallTopUpLeaders = useMemo(
    () => [...vehicleRiskRows].filter((row) => row.smallTopUpOps > 0).sort((a, b) => (b.smallTopUpOps === a.smallTopUpOps ? b.smallTopUpQty - a.smallTopUpQty : b.smallTopUpOps - a.smallTopUpOps)).slice(0, 5),
    [vehicleRiskRows],
  )

  const topConsumers = useMemo(
    () => [...vehicleRiskRows].sort((a, b) => b.last30Qty - a.last30Qty).slice(0, 10),
    [vehicleRiskRows],
  )

  const vehiclesWithoutData = useMemo(() => {
    const withMovements = new Set(movements.filter((movement) => movement.vehicleId).map((movement) => movement.vehicleId as string))
    return vehicles.filter((vehicle) => !withMovements.has(vehicle.id))
  }, [movements, vehicles])

  const frequentTopUpVehicles = useMemo(() => {
    return vehicleRiskRows
      .map((row) => {
        const topUps = row.last30.filter((movement) => /долив/i.test(movement.purpose) || /долив/i.test(movement.note))
        const smallTopUps = topUps.filter((movement) => Math.abs(movement.quantity) > 0 && Math.abs(movement.quantity) <= 15)
        const reserveOps = row.last30.filter((movement) => /резерв/i.test(movement.purpose) || /резерв/i.test(movement.note)).length
        const topUpQty = topUps.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
        const smallTopUpQty = smallTopUps.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
        const hasChronicSmallTopUps = smallTopUps.length >= 3 || (smallTopUps.length >= 2 && smallTopUpQty >= 10)
        const isMostlySmallTopUps = row.currentQty <= row.plannedReplacementQty + smallTopUpQty + 12
        const hasNoEmergencyTopUps = row.emergencyTopUpOps === 0
        return {
          ...row,
          topUpOps: topUps.length,
          topUpQty,
          smallTopUpOps: smallTopUps.length,
          smallTopUpQty,
          reserveOps,
          hasChronicSmallTopUps,
          isMostlySmallTopUps,
          hasNoEmergencyTopUps,
        }
      })
      .filter((row) => row.hasChronicSmallTopUps && row.isMostlySmallTopUps && row.hasNoEmergencyTopUps)
      .sort((a, b) => (b.smallTopUpOps === a.smallTopUpOps ? b.smallTopUpQty - a.smallTopUpQty : b.smallTopUpOps - a.smallTopUpOps))
  }, [vehicleRiskRows])

  const receiptRegistryRows = useMemo(() => {
    return analyticsRows
      .map((row) => {
        const receipts = movements
          .filter((movement) => movement.type === 'receipt' && movement.productId === row.product.id)
          .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
        const issues = movements
          .filter((movement) => movement.type === 'issue' && movement.productId === row.product.id)
          .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
        return {
          product: row.product,
          receipts,
          issues,
          current: row.current,
          expectedCurrent: row.current,
          minStockGap: row.current - row.product.minStock,
        }
      })
      .sort((a, b) => a.current - b.current)
  }, [analyticsRows, movements])

  const maintenanceRegistryRows = useMemo(() => {
    return vehicles
      .map((vehicle) => {
        const lastToDate = vehicleLastToDateMap.get(vehicle.id) ?? ''
        const intervalDays = vehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[vehicle.type]
        const nextDate = lastToDate ? addDays(lastToDate, intervalDays) : ''
        const state = nextDate ? maintenanceStateByDate(nextDate, analyticsBaseDate) : 'unknown'
        return {
          vehicle,
          lastToDate,
          nextDate,
          intervalDays,
          state,
        }
      })
      .filter((row) => row.state === 'soon' || row.state === 'overdue')
      .sort((a, b) => {
        const stateRank = a.state === 'overdue' ? 0 : 1
        const otherRank = b.state === 'overdue' ? 0 : 1
        if (stateRank !== otherRank) return stateRank - otherRank
        return compareOptionalDateDesc(a.nextDate, b.nextDate)
      })
  }, [analyticsBaseDate, vehicleLastToDateMap, vehicles])

  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId && vehicleMap.has(selectedVehicleId)) return vehicleMap.get(selectedVehicleId) ?? null
    return filteredVehicles[0] ?? vehicles[0] ?? null
  }, [filteredVehicles, selectedVehicleId, vehicleMap, vehicles])

  const selectedVehicleMovements = useMemo(() => {
    if (!selectedVehicle) return []
    return movements
      .filter((movement) => movement.vehicleId === selectedVehicle.id)
      .sort(compareMovementOrderDesc)
  }, [movements, selectedVehicle])

  const selectedVehicleIssues = useMemo(
    () => selectedVehicleMovements.filter((movement) => movement.type === 'issue'),
    [selectedVehicleMovements],
  )

  const selectedVehicleSummary = useMemo(() => {
    if (!selectedVehicle) return []
    const grouped = new Map<string, { product: Product; total: number; lastDate: string; operations: number }>()
    selectedVehicleIssues.forEach((movement) => {
      const product = productMap.get(movement.productId)
      if (!product) return
      const current = grouped.get(product.id)
      if (current) {
        current.total += Math.abs(movement.quantity)
        current.operations += 1
        if (movement.date > current.lastDate) current.lastDate = movement.date
      } else {
        grouped.set(product.id, {
          product,
          total: Math.abs(movement.quantity),
          lastDate: movement.date,
          operations: 1,
        })
      }
    })
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  }, [productMap, selectedVehicle, selectedVehicleIssues])

  const selectedVehicleIssueUnitLabel = useMemo(() => {
    const units = Array.from(
      new Set(
        selectedVehicleIssues
          .map((movement) => productMap.get(movement.productId)?.unit)
          .filter((value): value is Unit => Boolean(value)),
      ),
    )
    if (units.length === 0) return 'ед.'
    if (units.length === 1) return units[0]
    return 'в разных ед.'
  }, [productMap, selectedVehicleIssues])

  const selectedVehiclePurposeSummary = useMemo(() => {
    const grouped = new Map<string, number>()
    selectedVehicleIssues.forEach((movement) => {
      const key = movement.purpose || 'Расход'
      grouped.set(key, (grouped.get(key) ?? 0) + Math.abs(movement.quantity))
    })
    return Array.from(grouped.entries())
      .map(([purpose, total]) => ({ purpose, total }))
      .sort((a, b) => b.total - a.total)
  }, [selectedVehicleIssues])

  const expandedVehiclePurposeMovements = useMemo(() => {
    if (!expandedVehiclePurpose) return []
    return [...selectedVehicleIssues]
      .filter((movement) => (movement.purpose || 'Расход') === expandedVehiclePurpose)
      .sort(compareMovementOrderDesc)
  }, [expandedVehiclePurpose, selectedVehicleIssues])

  const expandedVehicleProductMovements = useMemo(() => {
    if (!expandedVehicleProductId) return []
    return [...selectedVehicleIssues]
      .filter((movement) => movement.productId === expandedVehicleProductId)
      .sort(compareMovementOrderDesc)
  }, [expandedVehicleProductId, selectedVehicleIssues])

  const expandedVehicleProduct = expandedVehicleProductId ? productMap.get(expandedVehicleProductId) ?? null : null

  const selectedVehicleLast30 = useMemo(
    () => selectedVehicleIssues.filter((movement) => isWithinDays(movement.date, 30)).reduce((sum, movement) => sum + Math.abs(movement.quantity), 0),
    [selectedVehicleIssues],
  )

  const selectedVehiclePrev30 = useMemo(
    () => selectedVehicleIssues.filter((movement) => isBetweenDays(movement.date, 31, 60)).reduce((sum, movement) => sum + Math.abs(movement.quantity), 0),
    [selectedVehicleIssues],
  )

  const selectedVehicleRisk = useMemo(() => {
    if (!selectedVehicle) return null
    return vehicleRiskRowsAllTime.find((row) => row.vehicle.id === selectedVehicle.id) ?? vehicleRiskRows.find((row) => row.vehicle.id === selectedVehicle.id) ?? null
  }, [selectedVehicle, vehicleRiskRows, vehicleRiskRowsAllTime])

  const selectedVehicleNorms = useMemo(() => {
    if (!selectedVehicle) return null
    return {
      intervalDays: selectedVehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[selectedVehicle.type],
      intervalRunHours: selectedVehicle.serviceIntervalRunHours ?? MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[selectedVehicle.type],
      runHoursUnit: selectedVehicle.serviceRunHoursUnit || (selectedVehicle.type === 'Грузовик' || selectedVehicle.type === 'Автомобиль' ? 'км' : 'м/ч'),
      topUpLimits: NORMAL_TOPUP_LIMITS_BY_TYPE[selectedVehicle.type],
    }
  }, [selectedVehicle])

  const selectedVehicleTopUpMovements = useMemo(
    () => selectedVehicleIssues.filter((movement) => /долив/i.test(movement.purpose) || /долив/i.test(movement.note)),
    [selectedVehicleIssues],
  )

  const selectedVehicleSmallTopUps = useMemo(
    () => selectedVehicleTopUpMovements.filter((movement) => Math.abs(movement.quantity) > 0 && Math.abs(movement.quantity) <= 15),
    [selectedVehicleTopUpMovements],
  )

  const selectedVehicleSmallTopUpQty = useMemo(
    () => selectedVehicleSmallTopUps.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0),
    [selectedVehicleSmallTopUps],
  )

  const selectedVehicleMaxTopUpQty = useMemo(
    () => selectedVehicleTopUpMovements.reduce((max, movement) => Math.max(max, Math.abs(movement.quantity)), 0),
    [selectedVehicleTopUpMovements],
  )

  const selectedVehicleSystemStats = useMemo(() => {
    if (!selectedVehicle) return [] as Array<{ system: VehicleSystem; label: string; total: number; topUps: number; topUpQty: number; maxTopUp: number; limit: number }>
    const grouped = new Map<VehicleSystem, { total: number; topUps: number; topUpQty: number; maxTopUp: number }>()
    selectedVehicleIssues.forEach((movement) => {
      const product = productMap.get(movement.productId)
      const system = inferVehicleSystem(product, `${movement.purpose} ${movement.note}`)
      const qty = Math.abs(movement.quantity)
      const current = grouped.get(system) ?? { total: 0, topUps: 0, topUpQty: 0, maxTopUp: 0 }
      current.total += qty
      if (/долив/i.test(movement.purpose) || /долив/i.test(movement.note)) {
        current.topUps += 1
        current.topUpQty += qty
        current.maxTopUp = Math.max(current.maxTopUp, qty)
      }
      grouped.set(system, current)
    })
    return Array.from(grouped.entries())
      .map(([system, stat]) => ({
        system,
        label: vehicleSystemLabel(system),
        total: stat.total,
        topUps: stat.topUps,
        topUpQty: stat.topUpQty,
        maxTopUp: stat.maxTopUp,
        limit: selectedVehicleNorms?.topUpLimits[system] ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [productMap, selectedVehicle, selectedVehicleIssues, selectedVehicleNorms])

  const selectedVehicleToMovements = useMemo(
    () => selectedVehicleIssues.filter((movement) => /\bто\b|замен/i.test(`${movement.purpose} ${movement.note}`)).sort(compareMovementOrderDesc),
    [selectedVehicleIssues],
  )

  const selectedVehicleLastToMovement = useMemo(
    () => selectedVehicleToMovements[0] ?? null,
    [selectedVehicleToMovements],
  )

  const selectedVehiclePreviousToMovement = useMemo(
    () => selectedVehicleToMovements[1] ?? null,
    [selectedVehicleToMovements],
  )

  const selectedVehicleNextTo = useMemo(() => {
    if (!selectedVehicle || !selectedVehicleNorms) return null
    const lastToDate = selectedVehicleLastToMovement?.date ?? vehicleLastToDateMap.get(selectedVehicle.id) ?? ''
    const nextDate = lastToDate ? addDays(lastToDate, selectedVehicleNorms.intervalDays) : ''
    const currentRunHours = parseRunHoursValue(selectedVehicleMovements[0]?.runHours)
    const lastToRunHours = parseRunHoursValue(selectedVehicleLastToMovement?.runHours)
    const previousToRunHours = parseRunHoursValue(selectedVehiclePreviousToMovement?.runHours)
    const runHoursUnit = detectRunHoursUnit(selectedVehicleLastToMovement?.runHours) || detectRunHoursUnit(selectedVehicleMovements[0]?.runHours) || selectedVehicleNorms.runHoursUnit
    const nextRunHours = lastToRunHours !== null ? lastToRunHours + selectedVehicleNorms.intervalRunHours : null
    const remainRunHours = currentRunHours !== null && nextRunHours !== null ? Math.round(nextRunHours - currentRunHours) : null
    const actualIntervalRunHours = lastToRunHours !== null && previousToRunHours !== null ? Math.round(lastToRunHours - previousToRunHours) : null
    const state = nextDate ? maintenanceStateByDate(nextDate, analyticsBaseDate) : 'unknown'
    return {
      lastToDate,
      nextDate,
      currentRunHours,
      lastToRunHours,
      previousToRunHours,
      actualIntervalRunHours,
      nextRunHours,
      remainRunHours,
      runHoursUnit,
      state,
    }
  }, [analyticsBaseDate, selectedVehicle, selectedVehicleLastToMovement, selectedVehicleMovements, selectedVehicleNorms, selectedVehiclePreviousToMovement, vehicleLastToDateMap])

  const selectedVehicleLikelyIssues = useMemo(() => {
    if (!selectedVehicle) return [] as Array<{ title: string; detail: string; severity: 'watch' | 'warning' | 'critical' }>
    const reasons: Array<{ title: string; detail: string; severity: 'watch' | 'warning' | 'critical' }> = []
    const engine = selectedVehicleSystemStats.find((item) => item.system === 'engine')
    const hydraulic = selectedVehicleSystemStats.find((item) => item.system === 'hydraulic')
    const transmission = selectedVehicleSystemStats.find((item) => item.system === 'transmission')
    const cooling = selectedVehicleSystemStats.find((item) => item.system === 'cooling')

    if (engine && engine.topUps >= 3 && engine.topUpQty >= Math.max(12, engine.limit * 1.5)) {
      reasons.push({ title: 'Возможен износ двигателя или течь моторной системы', detail: `Повторяемые доливы по двигателю: ${engine.topUps} опер., ${formatNumber(engine.topUpQty)} л. Норма долива: до ${formatNumber(engine.limit)} л между ТО.`, severity: engine.topUpQty >= 25 ? 'critical' : 'warning' })
    }
    if (hydraulic && (hydraulic.maxTopUp >= Math.max(20, hydraulic.limit * 1.4) || hydraulic.topUps >= 3)) {
      reasons.push({ title: 'Проверьте гидросистему на утечки', detail: `По гидравлике были доливы: ${hydraulic.topUps} опер., максимум ${formatNumber(hydraulic.maxTopUp)} л.`, severity: hydraulic.maxTopUp >= 40 ? 'critical' : 'warning' })
    }
    if (transmission && transmission.topUps >= 2 && transmission.topUpQty >= Math.max(8, transmission.limit * 1.3)) {
      reasons.push({ title: 'Нужна проверка трансмиссии / редукторов', detail: `Доливы по трансмиссии: ${transmission.topUps} опер., ${formatNumber(transmission.topUpQty)} л.`, severity: transmission.topUpQty >= 20 ? 'critical' : 'warning' })
    }
    if (cooling && (cooling.topUps >= 2 || cooling.topUpQty >= Math.max(8, cooling.limit * 1.5))) {
      reasons.push({ title: 'Есть признак проблем в системе охлаждения', detail: `По охлаждению зафиксировано ${cooling.topUps} доливов на ${formatNumber(cooling.topUpQty)} л.`, severity: cooling.topUpQty >= 15 ? 'warning' : 'watch' })
    }
    if (selectedVehicleNextTo?.state === 'soon') {
      reasons.push({ title: 'Скоро плановое ТО', detail: `Следующее ТО ожидается ${selectedVehicleNextTo.nextDate || 'скоро'} — стоит подготовить обслуживание заранее.`, severity: 'watch' })
    }
    if (selectedVehicleNextTo?.state === 'overdue') {
      reasons.push({ title: 'ТО просрочено', detail: `Последнее ТО: ${selectedVehicleNextTo.lastToDate || 'нет данных'}, плановое следующее: ${selectedVehicleNextTo.nextDate || 'не рассчитано'}.`, severity: 'warning' })
    }
    if (selectedVehicleRisk?.score && selectedVehicleRisk.score >= 7) {
      reasons.push({ title: 'Общий риск по машине критический', detail: selectedVehicleRisk.recommendation, severity: 'critical' })
    }
    return reasons.slice(0, 5)
  }, [selectedVehicle, selectedVehicleNextTo, selectedVehicleRisk, selectedVehicleSystemStats])

  const selectedVehicleAnomaly = Boolean(
    selectedVehicleRisk && selectedVehicleRisk.score >= 4
      || selectedVehiclePrev30 > 0 && selectedVehicleLast30 > selectedVehiclePrev30 * 1.5
      || selectedVehicleSmallTopUps.length >= 3
      || selectedVehicleSmallTopUpQty >= 20
      || (selectedVehicleMaxTopUpQty >= 20 && selectedVehicleSmallTopUps.length >= 2),
  )

  const registryCaseMap = useMemo(() => new Map(registryCases.map((item) => [item.vehicleId, item])), [registryCases])

  const dashboardStatusVehicles = useMemo(() => {
    if (!dashboardStatusModal) return []
    return vehicles.filter((vehicle) => vehicle.status === dashboardStatusModal)
  }, [dashboardStatusModal, vehicles])

  const selectedVehicleInspectionHistory = useMemo(() => {
    if (!selectedVehicle) return []
    return [...inspectionRecords]
      .filter((record) => record.vehicleId === selectedVehicle.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [inspectionRecords, selectedVehicle])

  const registryVehicleRows = useMemo(() => {
    const byId = new Map(vehicleRiskRows.map((item) => [item.vehicle.id, item]))
    return vehicles
      .map((vehicle) => {
        const risk = byId.get(vehicle.id)
        const topUp = frequentTopUpVehicles.find((item) => item.vehicle.id === vehicle.id)
        const caseRow = registryCaseMap.get(vehicle.id)
        const history = inspectionRecords
          .filter((record) => record.vehicleId === vehicle.id)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
        const hasData = movements.some((movement) => movement.vehicleId === vehicle.id)
        const maintenanceRow = maintenanceRegistryRows.find((item) => item.vehicle.id === vehicle.id) ?? null

        const registryLabel = !hasData
          ? 'Без данных'
          : risk
            ? 'Подозрительный расход'
            : topUp
              ? 'Частые малые доливы'
              : maintenanceRow
                ? 'ТО скоро / просрочено'
                : 'На контроле'

        const priority: 'critical' | 'warning' | 'watch' | 'normal' = !hasData
          ? 'warning'
          : risk?.severity === 'critical' || caseRow?.status === 'repair' || maintenanceRow?.state === 'overdue'
            ? 'critical'
            : risk?.severity === 'warning' || caseRow?.status === 'inspection' || maintenanceRow?.state === 'soon'
              ? 'warning'
              : topUp || caseRow?.status === 'new'
                ? 'watch'
                : 'normal'

        const priorityRank = priority === 'critical' ? 0 : priority === 'warning' ? 1 : priority === 'watch' ? 2 : 3
        const priorityLabel = priority === 'critical' ? 'Высокий' : priority === 'warning' ? 'Средний' : priority === 'watch' ? 'Наблюдение' : 'Низкий'

        const reasonPills = [
          !hasData ? 'Нет ни одной операции по машине' : '',
          ...(risk?.reasons ?? []).slice(0, 3),
          topUp ? `${topUp.smallTopUpOps} мал. доливов · ${formatNumber(topUp.smallTopUpQty)} л / кг` : '',
          maintenanceRow ? `${maintenanceRow.state === 'overdue' ? 'ТО просрочено' : 'Скоро ТО'} · ${maintenanceRow.nextDate || maintenanceRow.lastToDate || 'без даты'}` : '',
          caseRow?.note?.trim() ?? '',
        ].filter(Boolean)

        const reasonText = reasonPills.length > 0 ? reasonPills.join(' · ') : 'Техника находится на контроле без активных замечаний.'
        const registryKind = !hasData ? 'noData' : risk ? 'risk' : topUp ? 'topUp' : maintenanceRow ? 'maintenance' : 'all'

        return {
          vehicle,
          risk,
          topUp,
          maintenanceRow,
          caseRow,
          registryKind,
          registryLabel,
          priority,
          priorityRank,
          priorityLabel,
          reasonPills,
          reasonText,
          lastInspection: history[0] ?? null,
          inspectionsCount: history.length,
          hasData,
        }
      })
      .filter((row) => {
        if (registryKindFilter !== 'all' && row.registryKind !== registryKindFilter) return false
        const statusValue = row.caseRow?.status ?? 'new'
        if (registryStatusFilter !== 'all' && statusValue !== registryStatusFilter) return false
        if (registryPriorityFilter !== 'all' && row.priority !== registryPriorityFilter) return false
        const query = registrySearch.trim().toLowerCase()
        if (!query) return true
        return [
          row.vehicle.name,
          row.vehicle.plate,
          row.vehicle.type,
          row.vehicle.responsible,
          row.registryLabel,
          row.reasonText,
          row.caseRow?.note ?? '',
        ].join(' ').toLowerCase().includes(query)
      })
      .sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
        const byRisk = (b.risk?.score ?? 0) - (a.risk?.score ?? 0)
        if (byRisk !== 0) return byRisk
        const byTopUps = (b.topUp?.smallTopUpOps ?? 0) - (a.topUp?.smallTopUpOps ?? 0)
        if (byTopUps !== 0) return byTopUps
        const byInspection = compareOptionalDateDesc(a.lastInspection?.date ?? '', b.lastInspection?.date ?? '')
        if (byInspection !== 0) return byInspection
        return a.vehicle.name.localeCompare(b.vehicle.name, 'ru')
      })
  }, [vehicleRiskRows, frequentTopUpVehicles, registryCaseMap, inspectionRecords, maintenanceRegistryRows, movements, registryKindFilter, registryPriorityFilter, registrySearch, registryStatusFilter, vehicles])

  function updateRegistryCase(vehicleId: string, status: RegistryStatus, note = '', owner = '') {
    setRegistryCases((current) => {
      const existing = current.find((item) => item.vehicleId === vehicleId)
      const payload: RegistryCase = {
        vehicleId,
        status,
        note,
        owner,
        updatedAt: new Date().toISOString(),
      }
      if (existing) return current.map((item) => (item.vehicleId === vehicleId ? payload : item))
      return [payload, ...current]
    })

    // Repair state is managed from the repairs registry.
    setVehicles((current) =>
      current.map((vehicle) => {
        if (vehicle.id !== vehicleId) return vehicle
        const nextStatus: VehicleStatus =
          status === 'repair'
            ? 'repair'
            : status === 'inspection'
              ? 'maintenance'
              : 'active'
        return vehicle.status === nextStatus ? vehicle : { ...vehicle, status: nextStatus }
      }),
    )
  }

  function openInspectionForVehicle(vehicleId: string, stage: InspectionStage = 'inspection') {
    setSelectedVehicleId(vehicleId)
    setInspectionForm({
      date: today(),
      stage,
      mechanic: '',
      finding: '',
      action: '',
      recommendation: '',
    })
    setIsVehicleDetailsOpen(true)
    setNotice('Открыта форма осмотра/ремонта для выбранной машины.')
  }

  function saveInspectionRecord() {
    if (!selectedVehicle) {
      setNotice('Сначала выберите машину.')
      return
    }
    if (!inspectionForm.finding.trim() && !inspectionForm.action.trim()) {
      setNotice('Укажите результат осмотра или выполненное действие.')
      return
    }

    const payload: InspectionRecord = {
      id: uid(),
      vehicleId: selectedVehicle.id,
      date: inspectionForm.date,
      stage: inspectionForm.stage,
      mechanic: inspectionForm.mechanic.trim(),
      finding: inspectionForm.finding.trim(),
      action: inspectionForm.action.trim(),
      recommendation: inspectionForm.recommendation.trim(),
      createdAt: new Date().toISOString(),
    }

    setInspectionRecords((current) => [payload, ...current])

    const registryStatus: RegistryStatus =
      inspectionForm.stage === 'repair'
        ? 'repair'
        : inspectionForm.stage === 'closed'
          ? 'closed'
          : 'inspection'

    updateRegistryCase(selectedVehicle.id, registryStatus, payload.recommendation || payload.finding, payload.mechanic)
    setInspectionForm(emptyInspectionDraft())
    setNotice('Осмотр / ремонт сохранен в журнале.')
  }

  function resetInspectionForm() {
    setInspectionForm(emptyInspectionDraft())
  }

  function saveVehicle() {
    if (!vehicleForm.name.trim()) {
      setNotice('Укажите наименование техники.')
      return
    }

    const parsedIntervalDays = Number(vehicleForm.serviceIntervalDays)
    const parsedIntervalRunHours = Number(vehicleForm.serviceIntervalRunHours)
    const defaultRunUnit = vehicleForm.type === 'Грузовик' || vehicleForm.type === 'Автомобиль' ? 'км' : 'м/ч'

    const payload: Vehicle = {
      id: editingVehicleId ?? uid(),
      name: vehicleForm.name.trim(),
      plate: vehicleForm.plate.trim(),
      type: vehicleForm.type,
      department: vehicleForm.department.trim(),
      responsible: vehicleForm.responsible.trim(),
      status: vehicleForm.status,
      serviceIntervalDays: Number.isFinite(parsedIntervalDays) && parsedIntervalDays > 0 ? parsedIntervalDays : MAINTENANCE_INTERVAL_DAYS_BY_TYPE[vehicleForm.type],
      serviceIntervalRunHours: Number.isFinite(parsedIntervalRunHours) && parsedIntervalRunHours > 0 ? parsedIntervalRunHours : MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[vehicleForm.type],
      serviceRunHoursUnit: vehicleForm.serviceRunHoursUnit || defaultRunUnit,
      notes: vehicleForm.notes.trim(),
      createdAt: editingVehicleId ? vehicles.find((item) => item.id === editingVehicleId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
    }

    setVehicles((current) => {
      if (editingVehicleId) return current.map((item) => (item.id === editingVehicleId ? payload : item))
      return [payload, ...current]
    })

    setSelectedVehicleId(payload.id)
    setReopenVehicleDetailsAfterVehicleModal(false)
    setEditingVehicleId(null)
    setVehicleForm(emptyVehicleDraft())
    setIsVehicleModalOpen(false)
    setNotice(editingVehicleId ? 'Карточка техники обновлена.' : 'Техника добавлена.')
  }

  function closeVehicleModal(restoreVehicleDetails: boolean) {
    const shouldRestore = restoreVehicleDetails && Boolean(selectedVehicleId)
    setIsVehicleModalOpen(false)
    setEditingVehicleId(null)
    setVehicleForm(emptyVehicleDraft())
    setReopenVehicleDetailsAfterVehicleModal(false)
    if (shouldRestore) {
      setIsVehicleDetailsOpen(true)
    }
  }

  function editVehicle(vehicle: Vehicle) {
    const wasDetailsOpen = isVehicleDetailsOpen
    setIsVehicleDetailsOpen(false)
    setReopenVehicleDetailsAfterVehicleModal(wasDetailsOpen)
    setEditingVehicleId(vehicle.id)
    setSelectedVehicleId(vehicle.id)
    setVehicleForm({
      name: vehicle.name,
      plate: vehicle.plate,
      type: vehicle.type,
      department: vehicle.department,
      responsible: vehicle.responsible,
      status: vehicle.status === 'repair' ? 'active' : vehicle.status,
      serviceIntervalDays: String(vehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[vehicle.type]),
      serviceIntervalRunHours: String(vehicle.serviceIntervalRunHours ?? MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[vehicle.type]),
      serviceRunHoursUnit: vehicle.serviceRunHoursUnit || (vehicle.type === 'Грузовик' || vehicle.type === 'Автомобиль' ? 'км' : 'м/ч'),
      notes: vehicle.notes,
    })
    setIsVehicleModalOpen(true)
    setActiveTab('vehicles')
    setNotice('Открыта карточка для редактирования.')
  }

  function removeVehicle(id: string) {
    setVehicles((current) => current.filter((item) => item.id !== id))
    setMovements((current) => current.filter((item) => item.vehicleId !== id))
    if (editingVehicleId === id) {
      setEditingVehicleId(null)
      setVehicleForm(emptyVehicleDraft())
    }
    setNotice('Техника удалена.')
  }

  function saveProduct() {
    if (!productForm.name.trim()) {
      setNotice('Укажите наименование масла или жидкости.')
      return
    }

    const payload: Product = {
      id: editingProductId ?? uid(),
      name: productForm.name.trim(),
      category: productForm.category,
      unit: productForm.unit,
      packSize: Number(productForm.packSize) || 0,
      minStock: Number(productForm.minStock) || 0,
      price: Number(productForm.price) || 0,
      notes: productForm.notes.trim(),
    }

    setProducts((current) => {
      if (editingProductId) return current.map((item) => (item.id === editingProductId ? payload : item))
      return [payload, ...current]
    })

    setEditingProductId(null)
    setProductForm(emptyProductDraft())
    setIsProductModalOpen(false)
    setNotice(editingProductId ? 'Позиция обновлена.' : 'Позиция добавлена.')
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      packSize: String(product.packSize),
      minStock: String(product.minStock),
      price: String(product.price),
      notes: product.notes,
    })
    setIsProductModalOpen(true)
    setActiveTab('products')
  }

  function removeProduct(id: string) {
    setProducts((current) => current.filter((item) => item.id !== id))
    setMovements((current) => current.filter((item) => item.productId !== id))
    if (editingProductId === id) {
      setEditingProductId(null)
      setProductForm(emptyProductDraft())
    }
    setNotice('Позиция удалена.')
  }

  function saveContact() {
    if (!contactForm.name.trim()) {
      setNotice('Укажите имя сотрудника или поставщика.')
      return
    }

    const payload: Contact = {
      id: editingContactId ?? uid(),
      name: contactForm.name.trim(),
      kind: contactForm.kind,
      position: contactForm.kind === 'supplier' ? '' : contactForm.position.trim(),
      phone: contactForm.phone.trim(),
      note: contactForm.note.trim(),
    }

    setContacts((current) => {
      if (editingContactId) return current.map((item) => (item.id === editingContactId ? payload : item))
      return [payload, ...current]
    })

    setEditingContactId(null)
    setContactForm(emptyContactDraft())
    setIsContactModalOpen(false)
    setNotice(editingContactId ? 'Контакт обновлен.' : 'Контакт добавлен.')
  }

  function editContact(contact: Contact) {
    setEditingContactId(contact.id)
    setContactForm({
      name: contact.name,
      kind: contact.kind,
      position: contact.position ?? '',
      phone: contact.phone,
      note: contact.note,
    })
    setIsContactModalOpen(true)
    setActiveTab('directory')
  }

  function removeContact(id: string) {
    const target = contacts.find((item) => item.id === id)
    if (!target) return

    const confirmed = window.confirm('Удалить контакт из справочника? История операций не удаляется.')
    if (!confirmed) return

    setContacts((current) => current.filter((item) => item.id !== id))
    if (editingContactId === id) {
      setEditingContactId(null)
      setContactForm(emptyContactDraft())
      setIsContactModalOpen(false)
    }
    setNotice(`Контакт удален: ${target.name}.`)
  }

  function openMovementForPart(productId: string, type: 'receipt' | 'issue') {
    const purposeKind = type === 'issue' ? 'Ремонт' : 'Приход'
    const purposeSystem = type === 'issue' ? 'Другое' : ''
    setEditingMovementId(null)
    setMovementForm((prev) => ({
      ...emptyMovementDraft(type === 'issue' ? productId : products[0]?.id ?? productId),
      date: today(),
      type,
      productId,
      vehicleId: type === 'issue' ? prev.vehicleId : '',
      purposeKind,
      purposeSystem,
      purpose: type === 'issue' ? composeMovementPurpose(purposeKind, purposeSystem, 'Расход') : 'Приход',
    }))
    if (type === 'receipt') {
      setReceiptLines([emptyReceiptLine(productId)])
      setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? productId)])
    } else {
      setIssueLines([emptyIssueLine(productId)])
    }
    setIsMovementFormOpen(true)
    setActiveTab('movements')
    setNotice(type === 'receipt' ? 'Открыта форма прихода для запчасти.' : 'Открыта форма расхода запчасти.')
  }

  function closeMovementComposer() {
    setEditingMovementId(null)
    setIsMovementFormOpen(false)
    const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
    setMovementForm(emptyMovementDraft(fallbackProductId))
    setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
    setIssueLines([emptyIssueLine(fallbackProductId)])
  }

  function editMovement(movement: Movement) {
    const { kind, system } = movement.type === 'issue'
      ? splitMovementPurpose(movement.purpose || 'Расход')
      : { kind: movement.type === 'receipt' ? 'Приход' : 'Корректировка', system: '' }

    setEditingMovementId(movement.id)
    setMovementForm({
      date: movement.date,
      type: movement.type,
      productId: movement.productId,
      quantity: String(movement.quantity),
      unitPrice: movement.type === 'receipt' ? String(movement.unitPrice ?? 0) : '',
      vehicleId: movement.vehicleId ?? '',
      counterparty: movement.counterparty ?? '',
      documentNo: movement.documentNo ?? '',
      purposeKind: kind,
      purposeSystem: system,
      purpose: movement.purpose || (movement.type === 'receipt' ? 'Приход' : movement.type === 'issue' ? composeMovementPurpose(kind, system, 'Расход') : 'Корректировка'),
      note: movement.note ?? '',
      runHours: movement.runHours ?? '',
    })

    if (movement.type === 'receipt') {
      setReceiptLines([
        {
          id: uid(),
          productId: movement.productId,
          quantity: String(movement.quantity),
          unitPrice: String(movement.unitPrice ?? 0),
        },
      ])
      setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? movement.productId)])
    }

    if (movement.type === 'issue') {
      setIssueLines([
        {
          id: uid(),
          productId: movement.productId,
          quantity: String(movement.quantity),
        },
      ])
      setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
    }

    if (movement.type === 'adjustment') {
      setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? products[0]?.id ?? '')])
      setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
    }

    setIsMovementFormOpen(true)
    setActiveTab('movements')
    setNotice('Операция открыта для редактирования.')
  }

  function saveMovement() {
    const editingMovement = editingMovementId ? movements.find((item) => item.id === editingMovementId) : null

    if (movementForm.type === 'receipt') {
      const validLines = receiptLines
        .map((line) => ({
          ...line,
          quantityValue: Number(line.quantity),
          unitPriceValue: Number(line.unitPrice) || 0,
        }))
        .filter((line) => line.productId && line.quantityValue > 0)

      if (validLines.length === 0) {
        setNotice('Добавьте хотя бы одну позицию прихода с количеством.')
        return
      }

      if (editingMovement && validLines.length > 1) {
        setNotice('При редактировании можно сохранить только одну позицию прихода.')
        return
      }

      const receiptPayloads: Movement[] = validLines.map((line) => ({
        id: editingMovement?.id ?? uid(),
        date: movementForm.date,
        type: 'receipt',
        productId: line.productId,
        quantity: line.quantityValue,
        vehicleId: undefined,
        counterparty: movementForm.counterparty.trim(),
        documentNo: movementForm.documentNo.trim(),
        purpose: 'Приход',
        note: movementForm.note.trim(),
        runHours: '',
        unitPrice: line.unitPriceValue,
        createdAt: editingMovement?.createdAt ?? new Date().toISOString(),
      }))

      setMovements((current) => {
        if (editingMovement) {
          const updated = current.map((item) => (item.id === editingMovement.id ? receiptPayloads[0] : item))
          return updated.sort(compareMovementOrderDesc)
        }
        return [...receiptPayloads, ...current].sort(compareMovementOrderDesc)
      })
      setMovementDateFilter(movementForm.date)
      setMovementSortOrder('desc')
      setEditingMovementId(null)
      const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
      setMovementForm(emptyMovementDraft(fallbackProductId))
      setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
      setIssueLines([emptyIssueLine(fallbackProductId)])
      setIsMovementFormOpen(false)
      setNotice(editingMovement ? `Операция обновлена за ${movementForm.date}.` : `Приход сохранен: ${receiptPayloads.length} поз. за ${movementForm.date}.`)
      return
    }

    if (movementForm.type === 'issue') {
      if (!movementForm.vehicleId) {
        setNotice('Для расхода выберите технику.')
        return
      }

      const validLines = issueLines
        .map((line) => ({
          ...line,
          quantityValue: Number(line.quantity),
        }))
        .filter((line) => line.productId && line.quantityValue > 0)

      if (validLines.length === 0) {
        setNotice('Добавьте хотя бы одну позицию расхода с количеством.')
        return
      }

      if (editingMovement && validLines.length > 1) {
        setNotice('При редактировании можно сохранить только одну позицию расхода.')
        return
      }

      const hasNotEnoughStock = validLines.some((line) => {
        const currentStock = stockByProduct[line.productId] ?? 0
        const editingReturn = editingMovement?.type === 'issue' && editingMovement.productId === line.productId
          ? editingMovement.quantity
          : 0
        return line.quantityValue > currentStock + editingReturn
      })

      if (hasNotEnoughStock) {
        setNotice('Недостаточно остатка для одной из позиций расхода.')
        return
      }

      const normalizedPurpose = composeMovementPurpose(movementForm.purposeKind, movementForm.purposeSystem, movementForm.purpose || 'Расход')

      const issuePayloads: Movement[] = validLines.map((line) => ({
        id: editingMovement?.id ?? uid(),
        date: movementForm.date,
        type: 'issue',
        productId: line.productId,
        quantity: line.quantityValue,
        vehicleId: movementForm.vehicleId || undefined,
        counterparty: movementForm.counterparty.trim(),
        documentNo: movementForm.documentNo.trim(),
        purpose: normalizedPurpose,
        note: movementForm.note.trim(),
        runHours: movementForm.runHours.trim(),
        unitPrice: undefined,
        createdAt: editingMovement?.createdAt ?? new Date().toISOString(),
      }))

      setMovements((current) => {
        if (editingMovement) {
          const updated = current.map((item) => (item.id === editingMovement.id ? issuePayloads[0] : item))
          return updated.sort(compareMovementOrderDesc)
        }
        return [...issuePayloads, ...current].sort(compareMovementOrderDesc)
      })

      setMovementDateFilter(movementForm.date)
      setMovementSortOrder('desc')
      setEditingMovementId(null)
      const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
      setMovementForm(emptyMovementDraft(fallbackProductId))
      setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
      setIssueLines([emptyIssueLine(fallbackProductId)])
      setIsMovementFormOpen(false)
      setNotice(editingMovement ? `Операция обновлена за ${movementForm.date}.` : `Расход сохранен: ${issuePayloads.length} поз. за ${movementForm.date}.`)
      return
    }

    if (!movementForm.productId) {
      setNotice('Выберите номенклатуру.')
      return
    }

    const quantity = Number(movementForm.quantity)
    if (!quantity) {
      setNotice('Укажите количество.')
      return
    }

    const normalizedPurpose = movementForm.purpose.trim() || 'Корректировка'

    const payload: Movement = {
      id: editingMovement?.id ?? uid(),
      date: movementForm.date,
      type: movementForm.type,
      productId: movementForm.productId,
      quantity,
      vehicleId: movementForm.vehicleId || undefined,
      counterparty: movementForm.counterparty.trim(),
      documentNo: movementForm.documentNo.trim(),
      purpose: normalizedPurpose,
      note: movementForm.note.trim(),
      runHours: movementForm.runHours.trim(),
      unitPrice: undefined,
      createdAt: editingMovement?.createdAt ?? new Date().toISOString(),
    }

    setMovements((current) => {
      if (editingMovement) {
        const updated = current.map((item) => (item.id === editingMovement.id ? payload : item))
        return updated.sort(compareMovementOrderDesc)
      }
      return [payload, ...current].sort(compareMovementOrderDesc)
    })
    setMovementDateFilter(payload.date)
    setMovementSortOrder('desc')
    setEditingMovementId(null)
    const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
    setMovementForm(emptyMovementDraft(fallbackProductId))
    setIssueLines([emptyIssueLine(fallbackProductId)])
    setIsMovementFormOpen(false)
    setNotice(editingMovement ? `Операция обновлена за ${payload.date}.` : `Операция сохранена и показана за ${payload.date}.`)
  }

  function buildBackupPayload() {
    return {
      vehicles,
      products,
      movements,
      contacts,
      planningDays,
      registryCases,
      inspectionRecords,
      exportedAt: new Date().toISOString(),
    }
  }

  function exportBackup() {
    const payload = buildBackupPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `oil-accounting-backup-${today()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function copyShareLink() {
    const payload = {
      vehicles,
      products,
      movements,
      planningDays,
      registryCases,
      inspectionRecords,
      exportedAt: new Date().toISOString(),
    }

    try {
      const encoded = encodeBase64Url(JSON.stringify(payload))
      const shareUrl = `${window.location.origin}${window.location.pathname}#data=${encoded}`

      if (shareUrl.length > 180000) {
        setNotice('Ссылка слишком длинная для надежной передачи. Используйте Экспорт/Импорт JSON.')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setNotice('Ссылка с данными скопирована. Откройте ее на другом компьютере.')
    } catch {
      setNotice('Не удалось скопировать ссылку. Используйте Экспорт/Импорт JSON.')
    }
  }

  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (Array.isArray(parsed.vehicles)) setVehicles(sanitizeVehiclesNotes(parsed.vehicles))
        if (Array.isArray(parsed.products)) setProducts(parsed.products)
        if (Array.isArray(parsed.movements)) setMovements(parsed.movements)
        if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts)
        if (typeof parsed.planningDays === 'number') setPlanningDays(parsed.planningDays)
        if (Array.isArray(parsed.registryCases)) setRegistryCases(parsed.registryCases)
        if (Array.isArray(parsed.inspectionRecords)) setInspectionRecords(parsed.inspectionRecords)
        setNotice('Резервная копия загружена.')
      } catch {
        setNotice('Не удалось прочитать файл резервной копии.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="app-shell min-h-screen bg-[linear-gradient(180deg,#f9fcff_0%,#edf6ff_35%,#f8fbff_100%)] text-slate-800">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-7rem] top-[-7rem] h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-cyan-100/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className={glass('sticky top-4 z-20 px-5 py-5')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">ПаркКонтроль 360</h1>
              <p className="mt-1 text-sm text-slate-600">Система контроля автопарка: техника, масла, запчасти, движения и диагностика.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportBackup} className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgba(59,130,246,0.24)] transition hover:-translate-y-0.5 hover:bg-sky-600/90">Экспорт</button>
              <button onClick={copyShareLink} className="rounded-2xl border border-sky-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm backdrop-blur-2xl transition hover:bg-white/90">Скопировать ссылку с данными</button>
              <label className="rounded-2xl border border-sky-200/70 bg-sky-50/55 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm backdrop-blur-2xl transition hover:bg-sky-100/65">
                Импорт
                <input type="file" accept="application/json" className="hidden" onChange={importBackup} />
              </label>
            </div>
          </div>

          {notice ? <div className="mt-4 rounded-2xl border border-white/55 bg-white/42 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur-2xl">{notice}</div> : null}

          <nav className="mt-4 flex flex-wrap gap-2">
            {[
              ['dashboard', 'Обзор'],
              ['vehicles', 'Техника'],
              ['products', 'Номенклатура'],
              ['directory', 'Справочник'],
              ['parts', 'Запчасти'],
              ['movements', 'Движение'],
              ['analytics', 'Аналитика'],
              ['registries', 'Ремонты'],
              ['purchase', 'Закупка'],
            ].map(([value, label]) => {
              const isActive = activeTab === value
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value as Tab)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-sky-500/90 text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)]' : 'border border-white/60 bg-white/38 text-slate-700 shadow-sm backdrop-blur-2xl hover:bg-white/55'}`}
                >
                  {label}
                </button>
              )
            })}
          </nav>
        </header>

        {activeTab === 'dashboard' ? (
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setActiveTab('vehicles')}
                onMouseUp={() => setActiveTab('vehicles')}
                className={`${glass('cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/38 active:scale-[0.99]')}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Единиц техники</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{vehicles.length} шт.</div>
                    <div className="mt-2 text-xs text-slate-500">Открыть весь список техники</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                onMouseUp={() => setActiveTab('analytics')}
                className={`${glass('cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/38 active:scale-[0.99]')}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Проблемных машин</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{criticalRepairCandidates.length} шт.</div>
                    <div className="mt-2 text-xs text-slate-500">Перейти к аналитике проблем</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('registries')}
                onMouseUp={() => setActiveTab('registries')}
                className={`${glass('cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/38 active:scale-[0.99]')}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Машин с малыми доливами</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{frequentTopUpVehicles.length} шт.</div>
                    <div className="mt-2 text-xs text-slate-500">Открыть реестр частых малых доливов</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <div className={glass('p-5 text-left')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Номенклатурных позиций</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{products.length} поз.</div>
                    <div className="mt-2 text-xs text-slate-500">Текущая база номенклатуры для тестирования</div>
                  </div>
                  <span className="text-slate-400">•</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-1">
              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Статусы техники</h2>
                  <span className="text-sm text-slate-500">нажмите на статус</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {VEHICLE_STATUSES.map((status) => {
                    const count = vehicles.filter((vehicle) => vehicle.status === status.value).length
                    return (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setDashboardStatusModal(status.value)}
                        className="rounded-3xl border border-white/60 bg-white/38 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/52"
                      >
                        <div className="text-sm text-slate-500">{status.label}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{count} шт.</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Плановые замены</h2>
                  <span className="text-sm text-slate-500">ТО</span>
                </div>
                <div className="mt-4 space-y-3">
                  {plannedReplacementLeaders.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Плановых замен по текущему периоду не найдено.</div>
                  ) : (
                    plannedReplacementLeaders.map((item) => (
                      <button key={item.vehicle.id} onClick={() => { setSelectedVehicleId(item.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="w-full rounded-3xl border border-white/60 bg-white/38 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5">
                        <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                        <div className="mt-2 text-sm text-slate-600">ТО: {formatNumber(item.plannedReplacementQty)} л / кг · операций: {item.plannedReplacementOps} шт.</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Аварийные доливы</h2>
                  <span className="text-sm text-slate-500">крупные доливы</span>
                </div>
                <div className="mt-4 space-y-3">
                  {emergencyTopUpLeaders.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Крупные аварийные доливы не обнаружены.</div>
                  ) : (
                    emergencyTopUpLeaders.map((item) => (
                      <button key={item.vehicle.id} onClick={() => { setSelectedVehicleId(item.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="w-full rounded-3xl border border-rose-100/70 bg-rose-50/35 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5">
                        <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                        <div className="mt-2 text-sm text-slate-600">Аварийный долив: {formatNumber(item.emergencyTopUpQty)} л / кг · операций: {item.emergencyTopUpOps} шт.</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Подозрительные малые доливы</h2>
                  <span className="text-sm text-slate-500">повторяемость</span>
                </div>
                <div className="mt-4 space-y-3">
                  {smallTopUpLeaders.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Частые малые доливы не обнаружены.</div>
                  ) : (
                    smallTopUpLeaders.map((item) => (
                      <button key={item.vehicle.id} onClick={() => { setSelectedVehicleId(item.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="w-full rounded-3xl border border-amber-100/70 bg-amber-50/35 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5">
                        <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                        <div className="mt-2 text-sm text-slate-600">Малых доливов: {item.smallTopUpOps} шт. · объем: {formatNumber(item.smallTopUpQty)} л / кг</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'vehicles' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Техника</h2>
                  <p className="mt-1 text-sm text-slate-500">Весь парк списком. Чтобы изменить интервалы ТО и карточку машины, нажмите «Интервалы ТО» или значок ✎ на нужной технике.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-500">Всего: {filteredVehicles.length}</div>
                  <button
                    onClick={() => {
                      setReopenVehicleDetailsAfterVehicleModal(false)
                      setEditingVehicleId(null)
                      setVehicleForm(emptyVehicleDraft())
                      setIsVehicleModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить технику
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} placeholder="Поиск по технике / номеру / сотруднику" className="rounded-2xl border border-white/45 bg-white/26 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 md:col-span-2" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
                  <select value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value as 'all' | VehicleType)} className="rounded-2xl border border-white/45 bg-white/26 px-4 py-3 outline-none backdrop-blur-3xl">
                    <option value="all">Все типы</option>
                    {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <select value={vehicleStatusFilter} onChange={(e) => setVehicleStatusFilter(e.target.value as 'all' | VehicleStatus)} className="rounded-2xl border border-white/45 bg-white/26 px-4 py-3 outline-none backdrop-blur-3xl">
                    <option value="all">Все статусы</option>
                    {VEHICLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredVehicles.map((vehicle) => {
                  const vehicleIssues = movements.filter((movement) => movement.type === 'issue' && movement.vehicleId === vehicle.id)
                  const totalIssued = vehicleIssues.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
                  const lastIssue = [...vehicleIssues].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
                  const lastToDate = vehicleLastToDateMap.get(vehicle.id) ?? ''
                  const isSelected = selectedVehicle?.id === vehicle.id
                  return (
                    <div key={vehicle.id} className={`rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-2xl transition ${isSelected ? 'border-sky-200/80 bg-white/40 shadow-[0_14px_35px_rgba(59,130,246,0.14)]' : 'border-white/55 bg-white/30'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id)
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="min-w-0 text-left"
                        >
                          <div className="truncate text-[15px] font-semibold text-slate-900">{vehicle.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{vehicle.plate || 'Без госномера'} · {vehicle.type}</div>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${vehicle.status === 'repair' ? 'bg-rose-100/80 text-rose-700' : vehicle.status === 'maintenance' ? 'bg-amber-100/80 text-amber-700' : 'bg-emerald-100/80 text-emerald-700'}`}>{VEHICLE_STATUSES.find((item) => item.value === vehicle.status)?.label}</span>
                          <button
                            onClick={() => editVehicle(vehicle)}
                            aria-label="Редактировать технику"
                            title="Редактировать"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200/70 bg-sky-50/55 text-sky-700 backdrop-blur-2xl"
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <div>Ответственный: <span className="font-medium text-slate-900">{vehicle.responsible || '—'}</span></div>
                        <div>Подразделение: <span className="font-medium text-slate-900">{vehicle.department || '—'}</span></div>
                        <div>Последнее ТО: <span className="font-medium text-slate-900">{lastToDate || 'Нет данных'}</span></div>
                        <div>Последний расход: <span className="font-medium text-slate-900">{lastIssue?.date || '—'}</span></div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-slate-700">Расход: <span className="font-medium text-slate-900">{formatNumber(totalIssued)}</span></span>
                        <span className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-slate-700">ТО: <span className="font-medium text-slate-900">{vehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[vehicle.type]} дн.</span></span>
                        <span className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-slate-700">Интервал: <span className="font-medium text-slate-900">{formatNumber(vehicle.serviceIntervalRunHours ?? MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[vehicle.type])} {vehicle.serviceRunHoursUnit || (vehicle.type === 'Грузовик' || vehicle.type === 'Автомобиль' ? 'км' : 'м/ч')}</span></span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id)
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="rounded-xl border border-white/60 bg-white/30 px-3 py-1.5 text-xs text-slate-700 backdrop-blur-2xl"
                        >
                          Карточка
                        </button>
                        <button onClick={() => editVehicle(vehicle)} className="rounded-xl border border-sky-200/70 bg-sky-50/55 px-3 py-1.5 text-xs text-sky-700 backdrop-blur-2xl">Интервалы ТО</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'products' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Номенклатура</h2>
                  <p className="mt-1 text-sm text-slate-500">Поиск по наименованию, категории и примечаниям.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Всего: {filteredProducts.length}</span>
                  <button
                    onClick={() => {
                      setEditingProductId(null)
                      setProductForm(emptyProductDraft())
                      setIsProductModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить позицию
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Поиск по номенклатуре"
                  className="w-full rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400"
                />
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="rounded-[26px] border border-white/60 bg-white/30 p-4 shadow-sm backdrop-blur-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{product.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{product.category}</div>
                      </div>
                      <button
                        onClick={() => editProduct(product)}
                        aria-label="Редактировать позицию"
                        title="Редактировать"
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-200/70 bg-sky-50/55 text-sky-700 backdrop-blur-2xl transition hover:-translate-y-0.5"
                      >
                        ✎
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-sky-50/35 p-3 backdrop-blur-xl">Фасовка: <span className="font-medium text-slate-900">{formatNumber(product.packSize)} {product.unit}</span></div>
                      <div className="rounded-2xl bg-slate-50/35 p-3 backdrop-blur-xl">Остаток: <span className="font-medium text-slate-900">{formatNumber(stockByProduct[product.id] ?? 0)} {product.unit}</span></div>
                      <div className="rounded-2xl bg-amber-50/35 p-3 backdrop-blur-xl">Мин.: <span className="font-medium text-slate-900">{formatNumber(product.minStock)} {product.unit}</span></div>
                      <div className="rounded-2xl bg-emerald-50/35 p-3 backdrop-blur-xl">Цена: <span className="font-medium text-slate-900">{formatMoney(product.price)}</span></div>
                    </div>
                    {product.notes ? <div className="mt-3 text-sm text-slate-500">{product.notes}</div> : null}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => removeProduct(product.id)} className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-sm text-rose-700 backdrop-blur-xl">Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'directory' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Справочник сотрудников и поставщиков</h2>
                  <p className="mt-1 text-sm text-slate-500">Единый раздел для редактирования сотрудников, должностей и поставщиков.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Всего: {filteredContacts.length}</span>
                  <button
                    onClick={() => {
                      setEditingContactId(null)
                      setContactForm(emptyContactDraft())
                      setIsContactModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить контакт
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Поиск по имени, телефону, заметке"
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 md:col-span-2"
                />
                <select
                  value={contactKindFilter}
                  onChange={(e) => setContactKindFilter(e.target.value as 'all' | ContactKind)}
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                >
                  <option value="all">Все контакты</option>
                  <option value="person">Сотрудники</option>
                  <option value="supplier">Поставщики</option>
                </select>
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/60 bg-white/32 shadow-sm backdrop-blur-2xl">
                <div className="max-h-[700px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/48 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Имя</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                        <th className="px-4 py-3 font-medium">Должность</th>
                        <th className="px-4 py-3 font-medium">Телефон</th>
                        <th className="px-4 py-3 font-medium">Заметка</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3 font-medium text-slate-900">{contact.name}</td>
                          <td className="px-4 py-3">{contact.kind === 'supplier' ? 'Поставщик' : 'Сотрудник'}</td>
                          <td className="px-4 py-3">{contact.kind === 'supplier' ? '—' : (contact.position || '—')}</td>
                          <td className="px-4 py-3">{contact.phone || '—'}</td>
                          <td className="px-4 py-3">{contact.note || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => editContact(contact)} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-xs font-medium text-sky-700 backdrop-blur-2xl">Редактировать</button>
                              <button onClick={() => removeContact(contact.id)} className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-xs font-medium text-rose-700 backdrop-blur-2xl">Удалить</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'parts' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Контроль запчастей</h2>
                  <p className="mt-1 text-sm text-slate-500">Склад запчастей по текущим остаткам и расходу на технику.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">Позиций: {filteredSparePartRows.length}</span>
                  <button
                    onClick={() => {
                      setEditingProductId(null)
                      setProductForm({
                        ...emptyProductDraft(),
                        category: 'Запчасти',
                        unit: 'шт',
                        packSize: '1',
                      })
                      setIsProductModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить запчасть
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  placeholder="Поиск по запчастям"
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 md:col-span-2"
                />
                <div className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm text-slate-600 backdrop-blur-2xl">
                  Популярных: <span className="font-semibold text-slate-900">{popularSparePartRows.length} поз.</span>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/55 bg-white/26 p-4 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Популярные запчасти (часто меняются)</h3>
                  <span className="text-xs text-slate-500">Оценка по частоте расхода и количеству машин</span>
                </div>
                {popularSparePartRows.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-sm text-slate-500">Пока нет популярных позиций: недостаточно расходных операций.</div>
                ) : (
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {popularSparePartRows.slice(0, 6).map((row) => (
                      <div key={`popular-${row.product.id}`} className="rounded-2xl border border-white/60 bg-white/40 p-3 text-sm">
                        <div className="font-medium text-slate-900">{row.product.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.product.category || 'Запчасти'}</div>
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <div>Расход 30 дн.: <span className="font-medium text-slate-900">{formatNumber(row.last30Issue)} {row.product.unit || 'шт'}</span></div>
                          <div>Операций 30 дн.: <span className="font-medium text-slate-900">{row.opsLast30} шт.</span></div>
                          <div>Прогноз 30 дн.: <span className="font-medium text-slate-900">{formatNumber(row.forecast30)} {row.product.unit || 'шт'}</span></div>
                          <div>Машин в расходе: <span className="font-medium text-slate-900">{row.linkedVehiclesCount} шт.</span></div>
                          <div>Средний интервал: <span className="font-medium text-slate-900">{row.avgIntervalDays ? `${Math.round(row.avgIntervalDays)} дн.` : '—'}</span></div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => openMovementForPart(row.product.id, 'receipt')} className="rounded-xl border border-emerald-200/70 bg-emerald-50/55 px-3 py-1.5 text-xs text-emerald-700 backdrop-blur-2xl">Приход</button>
                          <button onClick={() => openMovementForPart(row.product.id, 'issue')} className="rounded-xl border border-sky-200/70 bg-sky-50/55 px-3 py-1.5 text-xs text-sky-700 backdrop-blur-2xl">Расход</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[68vh] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/55 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Запчасть</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                        <th className="px-4 py-3 font-medium">Расход 30 дн.</th>
                        <th className="px-4 py-3 font-medium">Прогноз 30 дн.</th>
                        <th className="px-4 py-3 font-medium">Машин в расходе</th>
                        <th className="px-4 py-3 font-medium">Сигнал</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSparePartRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={7}>Нет запчастей по текущему фильтру.</td>
                        </tr>
                      ) : (
                        filteredSparePartRows.map((row) => (
                          <tr key={row.product.id} className="border-t border-slate-100/80 text-slate-700">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{row.product.name}</div>
                              <div className="text-xs text-slate-500">{row.product.category || 'Запчасти'}</div>
                            </td>
                            <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit || 'шт'}</td>
                            <td className="px-4 py-3">{formatNumber(row.last30Issue)} {row.product.unit || 'шт'}</td>
                            <td className="px-4 py-3">{formatNumber(row.forecast30)} {row.product.unit || 'шт'}</td>
                            <td className="px-4 py-3">{row.linkedVehiclesCount} шт.</td>
                            <td className="px-4 py-3">
                              {row.isPopular ? (
                                <span className="rounded-full bg-sky-100/80 px-3 py-1 text-xs font-medium text-sky-700">Популярная</span>
                              ) : row.lowStock ? (
                                <span className="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700">Ниже минимума</span>
                              ) : (
                                <span className="rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700">В норме</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => openMovementForPart(row.product.id, 'receipt')} className="rounded-xl border border-emerald-200/70 bg-emerald-50/55 px-3 py-1.5 text-xs text-emerald-700 backdrop-blur-2xl">Приход</button>
                                <button onClick={() => openMovementForPart(row.product.id, 'issue')} className="rounded-xl border border-sky-200/70 bg-sky-50/55 px-3 py-1.5 text-xs text-sky-700 backdrop-blur-2xl">Расход</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'movements' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Журнал движений</h2>
                  <button
                    onClick={() => {
                      setEditingMovementId(null)
                      setMovementForm((prev) => ({
                        ...emptyMovementDraft(prev.productId || products[0]?.id || ''),
                        type: 'issue',
                        purposeKind: 'ТО',
                        purposeSystem: 'Двигатель',
                        purpose: composeMovementPurpose('ТО', 'Двигатель', 'Расход'),
                      }))
                      setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
                      setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? products[0]?.id ?? '')])
                      setIsMovementFormOpen((prev) => !prev)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    {isMovementFormOpen ? 'Скрыть форму' : 'Добавить операцию'}
                  </button>
                </div>
                <span className="text-sm text-slate-500">Записей: {filteredMovements.length}</span>
              </div>

              {isMovementFormOpen ? (
                <div className="mt-4 rounded-[28px] border border-white/60 bg-white/28 p-4 shadow-sm backdrop-blur-3xl">
                  <div className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{editingMovementId ? 'Редактирование операции' : 'Новая операция'}</div>
                      <div className="mt-1 text-sm text-slate-500">Сначала выберите тип операции, затем технику и укажите, на что именно идет масло: ТО, долив, ремонт и т.д.</div>
                    </div>
                    <div className="rounded-3xl border border-sky-100/70 bg-sky-50/45 p-4 text-sm text-slate-600 backdrop-blur-2xl">
                      <div className="font-medium text-slate-900">Как заполнять расход</div>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• <span className="font-medium">ТО</span> — плановая замена масла</li>
                        <li>• <span className="font-medium">Долив</span> — небольшое пополнение между ТО</li>
                        <li>• <span className="font-medium">Ремонт</span> — расход при ремонте узла</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Дата</span>
                        <input type="date" value={movementForm.date} onChange={(e) => setMovementForm((prev) => ({ ...prev, date: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Тип операции</span>
                        <select
                          value={movementForm.type}
                          onChange={(e) => {
                            const nextType = e.target.value as MovementType
                            setMovementForm((prev) => ({
                              ...prev,
                              type: nextType,
                              purposeKind: nextType === 'receipt' ? 'Приход' : nextType === 'adjustment' ? 'Корректировка' : prev.purposeKind,
                              purposeSystem: nextType === 'receipt' ? '' : nextType === 'adjustment' ? '' : prev.purposeSystem || 'Двигатель',
                              purpose: nextType === 'receipt'
                                ? 'Приход'
                                : nextType === 'adjustment'
                                  ? 'Корректировка'
                                  : composeMovementPurpose(prev.purposeKind || 'ТО', prev.purposeSystem || 'Двигатель', 'Расход'),
                            }))
                            if (nextType === 'receipt') {
                              setReceiptLines((current) => current.length ? current : [emptyReceiptLine(products[0]?.id ?? '')])
                            }
                            if (nextType === 'issue') {
                              const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
                              setIssueLines((current) => current.length ? current : [emptyIssueLine(fallbackProductId)])
                            }
                          }}
                          className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                        >
                          <option value="receipt">Приход</option>
                          <option value="issue">Расход</option>
                          <option value="adjustment">Корректировка</option>
                        </select>
                      </label>

                      {movementForm.type === 'receipt' ? (
                        <div className="grid gap-3 sm:col-span-3">
                          <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/24 px-4 py-3 text-sm text-slate-600 backdrop-blur-2xl">
                            <div>
                              <div className="font-medium text-slate-900">Позиции прихода</div>
                              <div className="mt-1 text-xs text-slate-500">Добавьте несколько позиций в один документ: количество и цену по каждой строке.</div>
                            </div>
                            {editingMovementId ? (
                              <span className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">В режиме редактирования доступна 1 позиция</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReceiptLines((current) => [...current, emptyReceiptLine(products[0]?.id ?? '')])}
                                className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl"
                              >
                                + Добавить позицию
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {receiptLines.map((line, index) => {
                              const lineProduct = productMap.get(line.productId)
                              const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
                              return (
                                <div key={line.id} className="grid gap-3 rounded-3xl border border-white/55 bg-white/24 p-4 backdrop-blur-2xl md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.7fr)_minmax(160px,0.85fr)_minmax(150px,auto)]">
                                  <label className="grid gap-2 text-sm text-slate-600 md:col-span-2 xl:col-span-1">
                                    <span>Позиция #{index + 1}</span>
                                    <select
                                      value={line.productId}
                                      onChange={(e) => setReceiptLines((current) => current.map((item) => item.id === line.id ? { ...item, productId: e.target.value } : item))}
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                                    >
                                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                    </select>
                                  </label>
                                  <label className="grid gap-2 text-sm text-slate-600">
                                    <span>Количество</span>
                                    <input
                                      value={line.quantity}
                                      onChange={(e) => setReceiptLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: e.target.value } : item))}
                                      placeholder="10"
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400"
                                    />
                                  </label>
                                  <label className="grid gap-2 text-sm text-slate-600">
                                    <span>Цена за ед.</span>
                                    <input
                                      value={line.unitPrice}
                                      onChange={(e) => setReceiptLines((current) => current.map((item) => item.id === line.id ? { ...item, unitPrice: e.target.value } : item))}
                                      placeholder="250"
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400"
                                    />
                                  </label>
                                  <div className="flex min-w-0 items-end justify-between gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
                                    <div className="text-right text-sm text-slate-500">
                                      <div>Сумма</div>
                                      <div className="mt-1 font-semibold text-slate-900">{formatMoney(lineTotal)}</div>
                                      <div className="mt-1 text-xs text-slate-500">{lineProduct?.unit ?? ''}</div>
                                    </div>
                                    {editingMovementId ? null : (
                                      <button
                                        type="button"
                                        onClick={() => setReceiptLines((current) => current.length === 1 ? [emptyReceiptLine(products[0]?.id ?? '')] : current.filter((item) => item.id !== line.id))}
                                        className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-sm text-rose-700 backdrop-blur-2xl"
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : movementForm.type === 'issue' ? (
                        <div className="grid gap-3 sm:col-span-3">
                          <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/24 px-4 py-3 text-sm text-slate-600 backdrop-blur-2xl">
                            <div>
                              <div className="font-medium text-slate-900">Позиции расхода</div>
                              <div className="mt-1 text-xs text-slate-500">Добавьте несколько товаров в одно списание по машине (например масло + фильтр).</div>
                            </div>
                            {editingMovementId ? (
                              <span className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">В режиме редактирования доступна 1 позиция</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIssueLines((current) => [...current, emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')])}
                                className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl"
                              >
                                + Добавить позицию
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {issueLines.map((line, index) => {
                              const lineProduct = productMap.get(line.productId)
                              return (
                                <div key={line.id} className="grid gap-3 rounded-3xl border border-white/55 bg-white/24 p-4 backdrop-blur-2xl md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.7fr)_minmax(180px,auto)]">
                                  <label className="grid gap-2 text-sm text-slate-600 md:col-span-2 xl:col-span-1">
                                    <span>Позиция #{index + 1}</span>
                                    <select
                                      value={line.productId}
                                      onChange={(e) => setIssueLines((current) => current.map((item) => item.id === line.id ? { ...item, productId: e.target.value } : item))}
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                                    >
                                      {availableProductsForOutflow.length === 0 ? <option value="">Нет позиций в наличии</option> : null}
                                      {availableProductsForOutflow.map((product) => (
                                        <option key={product.id} value={product.id}>{product.name} · в наличии {formatNumber(stockByProduct[product.id] ?? 0)} {product.unit}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-2 text-sm text-slate-600">
                                    <span>Количество</span>
                                    <input
                                      value={line.quantity}
                                      onChange={(e) => setIssueLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: e.target.value } : item))}
                                      placeholder="Например: 20"
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400"
                                    />
                                  </label>
                                  <div className="flex min-w-0 items-end justify-between gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
                                    <div className="text-right text-sm text-slate-500">
                                      <div>Ед. изм.</div>
                                      <div className="mt-1 font-semibold text-slate-900">{lineProduct?.unit || '—'}</div>
                                    </div>
                                    {editingMovementId ? null : (
                                      <button
                                        type="button"
                                        onClick={() => setIssueLines((current) => current.length === 1 ? [emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')] : current.filter((item) => item.id !== line.id))}
                                        className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-sm text-rose-700 backdrop-blur-2xl"
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <label className="grid gap-2 text-sm text-slate-600 sm:col-span-2">
                            <span>Техника</span>
                            <select value={movementForm.vehicleId} onChange={(e) => setMovementForm((prev) => ({ ...prev, vehicleId: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                              <option value="">Без привязки к технике</option>
                              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <>
                          <label className="grid gap-2 text-sm text-slate-600 sm:col-span-2">
                            <span>Номенклатура</span>
                            <select value={movementForm.productId} onChange={(e) => setMovementForm((prev) => ({ ...prev, productId: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                              {availableProductsForOutflow.length === 0 ? <option value="">Нет позиций в наличии</option> : null}
                              {availableProductsForOutflow.map((product) => <option key={product.id} value={product.id}>{product.name} · в наличии {formatNumber(stockByProduct[product.id] ?? 0)} {product.unit}</option>)}
                            </select>
                          </label>

                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>Количество</span>
                            <input value={movementForm.quantity} onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))} placeholder="Например: 10" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                          </label>

                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>Техника</span>
                            <select value={movementForm.vehicleId} onChange={(e) => setMovementForm((prev) => ({ ...prev, vehicleId: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                              <option value="">Без привязки к технике</option>
                              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
                            </select>
                          </label>
                        </>
                      )}

                      {movementForm.type === 'issue' ? (
                        <>
                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>На что расход</span>
                            <select
                              value={movementForm.purposeKind}
                              onChange={(e) => {
                                const nextKind = e.target.value
                                setMovementForm((prev) => ({
                                  ...prev,
                                  purposeKind: nextKind,
                                  purpose: composeMovementPurpose(nextKind, prev.purposeSystem, 'Расход'),
                                }))
                              }}
                              className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                            >
                              {MOVEMENT_PURPOSE_KIND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>

                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>Система / узел</span>
                            <select
                              value={movementForm.purposeSystem}
                              onChange={(e) => {
                                const nextSystem = e.target.value
                                setMovementForm((prev) => ({
                                  ...prev,
                                  purposeSystem: nextSystem,
                                  purpose: composeMovementPurpose(prev.purposeKind, nextSystem, 'Расход'),
                                }))
                              }}
                              className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                            >
                              {MOVEMENT_PURPOSE_SYSTEM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>
                        </>
                      ) : null}

                      <label className="grid gap-2 text-sm text-slate-600 sm:col-span-2">
                        <span>Пробег / моточасы</span>
                        <input value={movementForm.runHours} onChange={(e) => setMovementForm((prev) => ({ ...prev, runHours: e.target.value }))} placeholder="Например: 1450 м/ч или 235000 км" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>
                    </div>

                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>{movementForm.type === 'issue' ? 'Кому выдано' : movementForm.type === 'receipt' ? 'Поставщик / источник' : 'Ответственный'}</span>
                        <input list={movementForm.type === 'receipt' ? 'supplier-list' : 'people-list'} value={movementForm.counterparty} onChange={(e) => setMovementForm((prev) => ({ ...prev, counterparty: e.target.value }))} placeholder={movementForm.type === 'issue' ? 'ФИО получателя' : 'Контрагент / источник'} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Документ</span>
                        <input value={movementForm.documentNo} onChange={(e) => setMovementForm((prev) => ({ ...prev, documentNo: e.target.value }))} placeholder="Накладная, акт, путевой лист" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Назначение операции</span>
                        <input value={movementForm.purpose} onChange={(e) => setMovementForm((prev) => ({ ...prev, purpose: e.target.value }))} placeholder="Например: ТО · Гидравлика" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Комментарий</span>
                        <textarea value={movementForm.note} onChange={(e) => setMovementForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Что именно сделано, замечания, причина расхода" rows={4} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <div className="rounded-3xl border border-white/55 bg-white/24 p-4 text-sm text-slate-600 backdrop-blur-2xl">
                        <div className="font-medium text-slate-900">Как будет записано</div>
                        <div className="mt-2">{movementForm.type === 'receipt' ? 'Приход' : movementForm.type === 'adjustment' ? 'Корректировка' : movementForm.purpose || composeMovementPurpose(movementForm.purposeKind, movementForm.purposeSystem, 'Расход')}</div>
                        {movementForm.type === 'receipt' ? (
                          <div className="mt-3 space-y-2 rounded-2xl bg-sky-50/45 px-3 py-3 text-sm text-slate-700">
                            <div>Позиций в документе: <span className="font-semibold text-slate-900">{receiptLines.filter((line) => line.productId && Number(line.quantity) > 0).length}</span></div>
                            <div>Сумма прихода: <span className="font-semibold text-slate-900">{formatMoney(receiptLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0))}</span></div>
                          </div>
                        ) : movementForm.type === 'issue' ? (
                          <div className="mt-3 space-y-2 rounded-2xl bg-rose-50/45 px-3 py-3 text-sm text-slate-700">
                            <div>Позиции в списании: <span className="font-semibold text-slate-900">{issueLines.filter((line) => line.productId && Number(line.quantity) > 0).length}</span></div>
                            <div>Машина: <span className="font-semibold text-slate-900">{vehicleMap.get(movementForm.vehicleId)?.name || 'не выбрана'}</span></div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={saveMovement} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingMovementId ? 'Сохранить изменения' : 'Сохранить операцию'}</button>
                        <button onClick={closeMovementComposer} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <select value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value as 'all' | MovementType)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="all">Все операции</option>
                  <option value="receipt">Только приход</option>
                  <option value="issue">Только расход</option>
                  <option value="adjustment">Только корректировка</option>
                </select>
                <select value={movementProductFilter} onChange={(e) => setMovementProductFilter(e.target.value)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="all">Вся номенклатура</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <select value={movementVehicleFilter} onChange={(e) => setMovementVehicleFilter(e.target.value)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="all">Вся техника</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
                </select>
                <input type="date" value={movementDateFilter} onChange={(e) => setMovementDateFilter(e.target.value)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl" />
                <select value={movementSortOrder} onChange={(e) => setMovementSortOrder(e.target.value as 'desc' | 'asc')} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="desc">Сначала новые даты</option>
                  <option value="asc">Сначала старые даты</option>
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button onClick={() => { setEditingMovementId(null); setMovementTypeFilter('issue'); setIsMovementFormOpen(true); setMovementForm((prev) => ({ ...prev, type: 'issue', productId: availableProductsForOutflow[0]?.id ?? '', purposeKind: 'ТО', purposeSystem: prev.purposeSystem || 'Двигатель', purpose: composeMovementPurpose('ТО', prev.purposeSystem || 'Двигатель', 'Расход') })); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')]) }} className="rounded-2xl border border-white/60 bg-white/30 px-3 py-2 text-slate-700 backdrop-blur-2xl">Быстрый расход на ТО</button>
                <button onClick={() => { setEditingMovementId(null); setMovementTypeFilter('issue'); setIsMovementFormOpen(true); setMovementForm((prev) => ({ ...prev, type: 'issue', productId: availableProductsForOutflow[0]?.id ?? '', purposeKind: 'Долив', purposeSystem: prev.purposeSystem || 'Двигатель', purpose: composeMovementPurpose('Долив', prev.purposeSystem || 'Двигатель', 'Расход') })); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')]) }} className="rounded-2xl border border-white/60 bg-white/30 px-3 py-2 text-slate-700 backdrop-blur-2xl">Быстрый расход на долив</button>
                <button onClick={() => { setEditingMovementId(null); setMovementTypeFilter('receipt'); setIsMovementFormOpen(true); setMovementForm((prev) => ({ ...prev, type: 'receipt', productId: products[0]?.id ?? '', purposeKind: 'Приход', purposeSystem: '', purpose: 'Приход' })); setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')]); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? products[0]?.id ?? '')]) }} className="rounded-2xl border border-white/60 bg-white/30 px-3 py-2 text-slate-700 backdrop-blur-2xl">Быстрый приход</button>
                {movementDateFilter ? <button onClick={() => setMovementDateFilter('')} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sky-700 backdrop-blur-2xl">Сбросить дату</button> : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/22 px-4 py-3 text-sm text-slate-500 backdrop-blur-2xl">
                <div>Ниже — все операции по складу: приход, расход и корректировки.</div>
                <div>Для расхода теперь видно: <span className="font-medium text-slate-700">на что</span> и <span className="font-medium text-slate-700">по какой машине</span>.</div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/60 bg-white/32 shadow-sm backdrop-blur-2xl">
                <div className="max-h-[720px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/48 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Дата</th>
                        <th className="px-4 py-3 font-medium">Операция</th>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Количество</th>
                        <th className="px-4 py-3 font-medium">Цена / сумма</th>
                        <th className="px-4 py-3 font-medium">Техника / получатель</th>
                        <th className="px-4 py-3 font-medium">На что / назначение</th>
                        <th className="px-4 py-3 font-medium">Пробег / моточасы</th>
                        <th className="px-4 py-3 font-medium">Документ / комментарий</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => {
                        const product = productMap.get(movement.productId)
                        const receiptTotalAmount = movement.type === 'receipt' ? (movement.unitPrice ?? 0) * movement.quantity : 0
                        const issueTotalAmount = movement.type === 'issue' ? Math.abs(movement.quantity) * (product?.price ?? 0) : 0
                        return (
                          <tr key={movement.id} className="border-t border-slate-100/70 text-slate-700">
                            <td className="px-4 py-3">{movement.date}</td>
                            <td className="px-4 py-3">{movement.type === 'receipt' ? 'Приход' : movement.type === 'issue' ? 'Расход' : 'Корректировка'}</td>
                            <td className="px-4 py-3">{product?.name ?? '—'}</td>
                            <td className="px-4 py-3">{formatNumber(movement.quantity)} {product?.unit ?? ''}</td>
                            <td className="px-4 py-3">
                              {movement.type === 'receipt' ? (
                                <>
                                  <div className="font-medium text-slate-900">{formatMoney(movement.unitPrice ?? 0)}</div>
                                  <div className="mt-1 text-xs text-slate-500">Сумма: {formatMoney(receiptTotalAmount)}</div>
                                </>
                              ) : movement.type === 'issue' ? (
                                <>
                                  <div className="font-medium text-slate-900">Списание: {formatMoney(issueTotalAmount)}</div>
                                  <div className="mt-1 text-xs text-slate-500">Цена: {product ? formatMoney(product.price || 0) : '—'}</div>
                                </>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{vehicleMap.get(movement.vehicleId ?? '')?.name || 'Без привязки'}</div>
                              <div className="mt-1 text-xs text-slate-500">{movement.counterparty || '—'}</div>
                            </td>
                            <td className="px-4 py-3">{movement.purpose || '—'}</td>
                            <td className="px-4 py-3">{movement.runHours || '—'}</td>
                            <td className="px-4 py-3">{[movement.documentNo, movement.note].filter(Boolean).join(' · ') || '—'}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => editMovement(movement)}
                                className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-xs font-medium text-sky-700 backdrop-blur-2xl"
                              >
                                Редактировать
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'analytics' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Анализ остатков и расхода</h2>
                  <p className="mt-1 text-sm text-slate-500">Прогноз строится по выдаче за последние {planningDays} дней.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex rounded-2xl border border-white/60 bg-white/30 p-1 backdrop-blur-2xl">
                    <button
                      onClick={() => setProblemSortMode('recent')}
                      className={`rounded-2xl px-3 py-2 text-sm transition ${problemSortMode === 'recent' ? 'bg-sky-500/90 text-white shadow-[0_10px_22px_rgba(59,130,246,0.24)]' : 'text-slate-600 hover:bg-white/40'}`}
                    >
                      Недавно
                    </button>
                    <button
                      onClick={() => setProblemSortMode('allTime')}
                      className={`rounded-2xl px-3 py-2 text-sm transition ${problemSortMode === 'allTime' ? 'bg-sky-500/90 text-white shadow-[0_10px_22px_rgba(59,130,246,0.24)]' : 'text-slate-600 hover:bg-white/40'}`}
                    >
                      За всю историю
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">Горизонт планирования</span>
                  <input type="range" min="7" max="90" step="1" value={planningDays} onChange={(e) => setPlanningDays(Number(e.target.value))} />
                  <span className="rounded-full bg-sky-50/55 px-3 py-1 text-sm font-medium text-sky-700 backdrop-blur-xl">{planningDays} дн.</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/40 shadow-[0_24px_80px_rgba(91,156,255,0.16)] backdrop-blur-[26px]">
                <div className="max-h-[760px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/55 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Категория</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                        <th className="px-4 py-3 font-medium">30 дн.</th>
                        <th className="px-4 py-3 font-medium">Пред. 30</th>
                        <th className="px-4 py-3 font-medium">Прогноз</th>
                        <th className="px-4 py-3 font-medium">Нужно купить</th>
                        <th className="px-4 py-3 font-medium">Сигнал</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsRows.map((row) => (
                        <tr key={row.product.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.product.name}</td>
                          <td className="px-4 py-3">{row.product.category}</td>
                          <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.last30)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.prev30)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.forecast)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.purchaseQty)} {row.product.unit}</td>
                          <td className="px-4 py-3">{row.anomaly ? <span className="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700">Рост расхода</span> : <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-600">Норма</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className={glass('p-5')}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Кандидаты на осмотр</h3>
                    <span className="text-sm text-slate-500">{criticalRepairCandidates.length}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {criticalRepairCandidates.length === 0 ? (
                      <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Подозрительных машин пока нет: система не видит выраженного перерасхода по текущим данным.</div>
                    ) : (
                      criticalRepairCandidates.slice(0, 8).map((item) => (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.vehicle.type} · {item.vehicle.plate || 'Без номера'}</div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.severity === 'critical' ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'}`}>
                              {item.score} балл.
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-2xl bg-sky-50/45 p-3 backdrop-blur-xl">
                              <div className="text-slate-500">За 30 дней</div>
                              <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.last30Qty)}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50/45 p-3 backdrop-blur-xl">
                              <div className="text-slate-500">Среднее по типу</div>
                              <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.typeAverage)}</div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-600">{item.reasons.slice(0, 2).join(' · ')}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className={glass('p-5')}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Топ расход по машинам</h3>
                    <span className="text-sm text-slate-500">30 дней</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {topConsumers.length === 0 ? (
                      <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Нет данных по выдачам на технику.</div>
                    ) : (
                      topConsumers.map((item, index) => (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-slate-400">#{index + 1}</div>
                            <div className="truncate font-semibold text-slate-900">{item.vehicle.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.operations} опер. · {item.productKinds} вида масел</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500">Выдано</div>
                            <div className="text-lg font-semibold text-slate-900">{formatNumber(item.last30Qty)}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Подробный риск‑рейтинг техники</h3>
                <span className="text-sm text-slate-500">помогает найти машины на проверку</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[640px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Машина</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                        <th className="px-4 py-3 font-medium">30 дн.</th>
                        <th className="px-4 py-3 font-medium">Пред. 30</th>
                        <th className="px-4 py-3 font-medium">Среднее по типу</th>
                        <th className="px-4 py-3 font-medium">Опер.</th>
                        <th className="px-4 py-3 font-medium">Норма / ТО</th>
                        <th className="px-4 py-3 font-medium">Причины</th>
                        <th className="px-4 py-3 font-medium">Рекомендация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleRiskRows.map((item) => (
                        <tr key={item.vehicle.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedVehicleId(item.vehicle.id)
                                setActiveTab('vehicles')
                                setIsVehicleDetailsOpen(true)
                              }}
                              className="text-left"
                            >
                              <div className="font-medium text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.vehicle.plate || 'Без номера'}</div>
                            </button>
                          </td>
                          <td className="px-4 py-3">{item.vehicle.type}</td>
                          <td className="px-4 py-3">{formatNumber(item.last30Qty)}</td>
                          <td className="px-4 py-3">{formatNumber(item.prev30Qty)}</td>
                          <td className="px-4 py-3">{formatNumber(item.typeAverage)}</td>
                          <td className="px-4 py-3">{item.operations}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{item.vehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[item.vehicle.type]} дн.</div>
                            <div className="mt-1 text-xs text-slate-500">
                              ТО раз в {formatNumber(item.vehicle.serviceIntervalRunHours ?? MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[item.vehicle.type])} {item.vehicle.serviceRunHoursUnit || (item.vehicle.type === 'Грузовик' || item.vehicle.type === 'Автомобиль' ? 'км' : 'м/ч')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.reasons.length === 0 ? (
                                <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs text-slate-600">Сигналов нет</span>
                              ) : (
                                item.reasons.slice(0, 3).map((reason) => (
                                  <span
                                    key={reason}
                                    className={`rounded-full px-3 py-1 text-xs ${item.severity === 'critical' ? 'bg-rose-100/80 text-rose-700' : item.severity === 'warning' ? 'bg-amber-100/80 text-amber-700' : 'bg-sky-100/80 text-sky-700'}`}
                                  >
                                    {reason}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'registries' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Ремонты и контроль техники</h2>
                  <p className="mt-1 text-sm text-slate-500">Управление осмотрами и ремонтами машин, статусы обработки и последние решения механика.</p>
                </div>
                <span className="text-sm text-slate-500">{registryVehicleRows.length} машин в контуре</span>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-4">
                <input
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="Поиск по машине, причине или примечанию"
                  className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 xl:col-span-2"
                />
                <select
                  value={registryKindFilter}
                  onChange={(e) => setRegistryKindFilter(e.target.value as typeof registryKindFilter)}
                  className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl"
                >
                  <option value="all">Все контуры</option>
                  <option value="noData">Без данных</option>
                  <option value="maintenance">ТО скоро / просрочено</option>
                  <option value="risk">Подозрительный расход</option>
                  <option value="topUp">Частые малые доливы</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={registryStatusFilter}
                    onChange={(e) => setRegistryStatusFilter(e.target.value as typeof registryStatusFilter)}
                    className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl"
                  >
                    <option value="all">Все статусы</option>
                    {REGISTRY_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <select
                    value={registryPriorityFilter}
                    onChange={(e) => setRegistryPriorityFilter(e.target.value as typeof registryPriorityFilter)}
                    className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl"
                  >
                    <option value="all">Любой приоритет</option>
                    <option value="critical">Высокий</option>
                    <option value="warning">Средний</option>
                    <option value="watch">Наблюдение</option>
                    <option value="normal">Низкий</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Машина</th>
                        <th className="px-4 py-3 font-medium">Контур</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">Последний осмотр</th>
                        <th className="px-4 py-3 font-medium">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registryVehicleRows
                        .filter((row) => !row.hasData || row.risk || row.topUp || row.caseRow)
                        .map((row) => {
                          const statusValue = row.caseRow?.status ?? 'new'
                          return (
                            <tr key={row.vehicle.id} className="border-t border-slate-100/70 text-slate-700">
                              <td className="px-4 py-3">
                                <button onClick={() => { setSelectedVehicleId(row.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="text-left">
                                  <div className="font-medium text-slate-900">{row.vehicle.name}</div>
                                  <div className="mt-1 text-xs text-slate-500">{row.vehicle.type} · {row.vehicle.responsible || 'Ответственный не указан'}</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${row.priority === 'critical' ? 'bg-rose-100/80 text-rose-700' : row.priority === 'warning' ? 'bg-amber-100/80 text-amber-700' : row.priority === 'watch' ? 'bg-sky-100/80 text-sky-700' : 'bg-slate-100/80 text-slate-700'}`}>
                                      Приоритет: {row.priorityLabel}
                                    </span>
                                    {row.reasonPills.slice(0, 2).map((reason) => (
                                      <span key={reason} className="rounded-full bg-white/65 px-3 py-1 text-[11px] text-slate-600 backdrop-blur-2xl">{reason}</span>
                                    ))}
                                  </div>
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{row.registryLabel}</div>
                                <div className="mt-1 text-xs text-slate-500">{row.reasonText}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusValue === 'repair' ? 'bg-rose-100/80 text-rose-700' : statusValue === 'inspection' ? 'bg-amber-100/80 text-amber-700' : statusValue === 'closed' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100/80 text-slate-700'}`}>
                                  {REGISTRY_STATUS_OPTIONS.find((item) => item.value === statusValue)?.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">{row.lastInspection ? `${row.lastInspection.date} · ${row.lastInspection.mechanic || 'без механика'}` : 'Нет записей'}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => openInspectionForVehicle(row.vehicle.id, row.risk ? 'inspection' : row.topUp ? 'observation' : 'inspection')} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-xs text-sky-700 backdrop-blur-2xl">Осмотр</button>
                                  <button onClick={() => updateRegistryCase(row.vehicle.id, 'repair', row.caseRow?.note ?? '', row.caseRow?.owner ?? '')} className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-xs text-rose-700 backdrop-blur-2xl">В ремонт</button>
                                  <button onClick={() => updateRegistryCase(row.vehicle.id, 'closed', row.caseRow?.note ?? '', row.caseRow?.owner ?? '')} className="rounded-2xl border border-emerald-200/70 bg-emerald-50/45 px-3 py-2 text-xs text-emerald-700 backdrop-blur-2xl">Закрыть</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Машины без данных</h3>
                  <span className="text-sm text-slate-500">{vehiclesWithoutData.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {vehiclesWithoutData.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Для всей техники уже есть хотя бы одна операция.</div>
                  ) : (
                    vehiclesWithoutData.map((vehicle) => {
                      const caseRow = registryCaseMap.get(vehicle.id)
                      return (
                        <button
                          key={vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{vehicle.type} · {vehicle.responsible || 'Ответственный не указан'}</div>
                            </div>
                            <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">{REGISTRY_STATUS_OPTIONS.find((item) => item.value === (caseRow?.status ?? 'new'))?.label}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-600">Причина: по машине нет операций расхода, прихода и зафиксированных осмотров.</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">ТО скоро / просрочено</h3>
                  <span className="text-sm text-slate-500">{maintenanceRegistryRows.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {maintenanceRegistryRows.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Скорых или просроченных ТО сейчас не найдено.</div>
                  ) : (
                    maintenanceRegistryRows.slice(0, 8).map((item) => (
                      <button
                        key={item.vehicle.id}
                        onClick={() => {
                          setSelectedVehicleId(item.vehicle.id)
                          setActiveTab('vehicles')
                          setIsVehicleDetailsOpen(true)
                        }}
                        className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Последнее ТО: {item.lastToDate || 'нет данных'}</div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.state === 'overdue' ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'}`}>
                            {item.state === 'overdue' ? 'Просрочено' : 'Скоро ТО'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">Причина: следующее ТО {item.nextDate ? `ожидалось ${item.nextDate}` : 'не рассчитано'} · интервал {item.intervalDays} дн.</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Подозрительный расход и аварийные отклонения</h3>
                  <span className="text-sm text-slate-500">{criticalRepairCandidates.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {criticalRepairCandidates.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Сейчас нет машин с выраженным аномальным расходом, аварийными доливами или резким отклонением от нормы.</div>
                  ) : (
                    criticalRepairCandidates.map((item) => {
                      const caseRow = registryCaseMap.get(item.vehicle.id)
                      return (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.vehicle.type} · {item.last30.length} опер.</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.severity === 'critical' ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'}`}>
                                {item.score} балл.
                              </span>
                              <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">{REGISTRY_STATUS_OPTIONS.find((row) => row.value === (caseRow?.status ?? 'new'))?.label}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-600">Причина: {item.reasons.slice(0, 2).join(' · ') || 'аномальный расход без уточнения причины'}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Частые малые доливы</h3>
                  <span className="text-sm text-slate-500">{frequentTopUpVehicles.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {frequentTopUpVehicles.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Хронические небольшие доливы без явных аварийных всплесков пока не обнаружены.</div>
                  ) : (
                    frequentTopUpVehicles.map((item) => {
                      const caseRow = registryCaseMap.get(item.vehicle.id)
                      return (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">Малых доливов: {item.smallTopUpOps} · объем: {formatNumber(item.smallTopUpQty)}</div>
                            </div>
                            <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">{REGISTRY_STATUS_OPTIONS.find((row) => row.value === (caseRow?.status ?? 'new'))?.label}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-600">Причина: хронические небольшие доливы без явных аварийных всплесков · операций: {item.operations}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Реестр поступлений и остатков</h3>
                  <p className="mt-1 text-sm text-slate-500">Самостоятельный складской реестр сайта: приход, расход, текущий остаток и запас до минимального уровня.</p>
                </div>
                <span className="text-sm text-slate-500">{receiptRegistryRows.length} поз.</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[680px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Приход</th>
                        <th className="px-4 py-3 font-medium">Расход</th>
                        <th className="px-4 py-3 font-medium">Текущий остаток</th>
                        <th className="px-4 py-3 font-medium">Базовый остаток</th>
                        <th className="px-4 py-3 font-medium">До минимума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptRegistryRows.map((row) => (
                        <tr key={row.product.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.product.name}</td>
                          <td className="px-4 py-3">{formatNumber(row.receipts)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.issues)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.expectedCurrent)} {row.product.unit}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.minStockGap < 0 ? 'bg-rose-100/80 text-rose-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                              {row.minStockGap < 0 ? `${formatNumber(Math.abs(row.minStockGap))} ниже` : `${formatNumber(row.minStockGap)} запас`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'purchase' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Закупка</h2>
                  <p className="mt-1 text-sm text-slate-500">План закупки строится по текущим приходам, расходам, минимальному остатку и выбранному горизонту.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-500">Горизонт планирования</span>
                  <input type="range" min="7" max="90" step="1" value={planningDays} onChange={(e) => setPlanningDays(Number(e.target.value))} />
                  <span className="rounded-full bg-sky-50/55 px-3 py-1 text-sm font-medium text-sky-700 backdrop-blur-xl">{planningDays} дн.</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Позиции к закупке</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{analyticsRows.filter((row) => row.purchaseQty > 0).length} поз.</div>
              </div>
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Объем к закупке</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(analyticsRows.reduce((sum, row) => sum + row.purchaseQty, 0))}</div>
              </div>
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Упаковок / бочек</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(analyticsRows.reduce((sum, row) => sum + row.packsToBuy, 0))} шт.</div>
              </div>
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Оценка бюджета</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(analyticsRows.reduce((sum, row) => sum + row.purchaseQty * (row.product.price || 0), 0))}</div>
              </div>
            </div>

            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">План закупки по номенклатуре</h3>
                  <p className="mt-1 text-sm text-slate-500">Верхние строки — позиции, которые уже нужно докупать по текущим данным.</p>
                </div>
                <span className="text-sm text-slate-500">{analyticsRows.length} поз.</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[720px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                        <th className="px-4 py-3 font-medium">Расход за период</th>
                        <th className="px-4 py-3 font-medium">Прогноз</th>
                        <th className="px-4 py-3 font-medium">Мин. остаток</th>
                        <th className="px-4 py-3 font-medium">Нужно купить</th>
                        <th className="px-4 py-3 font-medium">Упаковок</th>
                        <th className="px-4 py-3 font-medium">Бюджет</th>
                        <th className="px-4 py-3 font-medium">Сигнал</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...analyticsRows]
                        .sort((a, b) => {
                          const needA = a.purchaseQty > 0 ? 1 : 0
                          const needB = b.purchaseQty > 0 ? 1 : 0
                          if (needB !== needA) return needB - needA
                          if (b.shortage !== a.shortage) return b.shortage - a.shortage
                          return a.product.name.localeCompare(b.product.name, 'ru')
                        })
                        .map((row) => (
                          <tr key={row.product.id} className="border-t border-slate-100/70 text-slate-700">
                            <td className="px-4 py-3 font-medium text-slate-900">{row.product.name}</td>
                            <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.last30)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.forecast)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.product.minStock)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.purchaseQty)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.packsToBuy)} шт.</td>
                            <td className="px-4 py-3">{formatMoney(row.purchaseQty * (row.product.price || 0))}</td>
                            <td className="px-4 py-3">
                              {row.purchaseQty > 0 ? (
                                <span className="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700">Купить</span>
                              ) : row.anomaly ? (
                                <span className="rounded-full bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-700">Рост расхода</span>
                              ) : (
                                <span className="rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700">Достаточно</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

      </div>

      {isVehicleModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/12 p-4 backdrop-blur-md">
          <div className={`${glass('w-full max-w-2xl p-5')}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingVehicleId ? 'Редактирование техники' : 'Новая техника'}</h3>
                <p className="mt-1 text-sm text-slate-500">Заполните карточку и сохраните изменения.</p>
              </div>
              <button
                onClick={() => closeVehicleModal(reopenVehicleDetailsAfterVehicleModal)}
                className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl"
              >
                Закрыть
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={vehicleForm.name} onChange={(e) => setVehicleForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Наименование" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 sm:col-span-2" />
              <input value={vehicleForm.plate} onChange={(e) => setVehicleForm((prev) => ({ ...prev, plate: e.target.value }))} placeholder="Госномер" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400" />
              <input value={vehicleForm.department} onChange={(e) => setVehicleForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Подразделение" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400" />
              <select
                value={vehicleForm.type}
                onChange={(e) => {
                  const nextType = e.target.value as VehicleType
                  setVehicleForm((prev) => ({
                    ...prev,
                    type: nextType,
                    serviceIntervalDays: prev.serviceIntervalDays || String(MAINTENANCE_INTERVAL_DAYS_BY_TYPE[nextType]),
                    serviceIntervalRunHours: prev.serviceIntervalRunHours || String(MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[nextType]),
                    serviceRunHoursUnit: prev.serviceRunHoursUnit || (nextType === 'Грузовик' || nextType === 'Автомобиль' ? 'км' : 'м/ч'),
                  }))
                }}
                className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl"
              >
                {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select value={vehicleForm.status} onChange={(e) => setVehicleForm((prev) => ({ ...prev, status: e.target.value as VehicleStatus }))} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl">
                {VEHICLE_EDITABLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <div className="rounded-[24px] border border-sky-100/70 bg-sky-50/35 p-4 backdrop-blur-2xl sm:col-span-2">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-900">Индивидуальные интервалы ТО</div>
                  <div className="mt-1 text-xs text-slate-500">Задайте свои интервалы замены именно для этой машины. Эти значения используются в карточке машины и в контроле ТО.</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={vehicleForm.serviceIntervalDays}
                    onChange={(e) => setVehicleForm((prev) => ({ ...prev, serviceIntervalDays: e.target.value }))}
                    inputMode="numeric"
                    placeholder="Интервал ТО, дн."
                    className="rounded-2xl border border-white/45 bg-white/50 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400"
                  />
                  <input
                    value={vehicleForm.serviceIntervalRunHours}
                    onChange={(e) => setVehicleForm((prev) => ({ ...prev, serviceIntervalRunHours: e.target.value }))}
                    inputMode="numeric"
                    placeholder="Интервал ТО, м/ч или км"
                    className="rounded-2xl border border-white/45 bg-white/50 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400"
                  />
                  <select
                    value={vehicleForm.serviceRunHoursUnit}
                    onChange={(e) => setVehicleForm((prev) => ({ ...prev, serviceRunHoursUnit: e.target.value as '' | 'м/ч' | 'км' }))}
                    className="rounded-2xl border border-white/45 bg-white/50 px-4 py-3 outline-none backdrop-blur-3xl"
                  >
                    <option value="">Ед. интервала</option>
                    <option value="м/ч">м/ч</option>
                    <option value="км">км</option>
                  </select>
                </div>
              </div>
              <input list="people-list" value={vehicleForm.responsible} onChange={(e) => setVehicleForm((prev) => ({ ...prev, responsible: e.target.value }))} placeholder="Ответственный" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 sm:col-span-2" />
              <textarea value={vehicleForm.notes} onChange={(e) => setVehicleForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Примечание" rows={4} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveVehicle} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingVehicleId ? 'Сохранить изменения' : 'Добавить технику'}</button>
              <button onClick={() => closeVehicleModal(reopenVehicleDetailsAfterVehicleModal)} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
              {editingVehicleId ? (
                <button
                  onClick={() => {
                    if (!window.confirm('Удалить эту технику и связанные движения?')) return
                    removeVehicle(editingVehicleId)
                    closeVehicleModal(false)
                  }}
                  className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur-2xl"
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/12 p-4 backdrop-blur-md">
          <div className={`${glass('w-full max-w-2xl p-5')}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingProductId ? 'Редактирование позиции' : 'Новая позиция'}</h3>
                <p className="mt-1 text-sm text-slate-500">Изменяйте параметры фасовки, минимума и цены.</p>
              </div>
              <button
                onClick={() => {
                  setIsProductModalOpen(false)
                  setEditingProductId(null)
                  setProductForm(emptyProductDraft())
                }}
                className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl"
              >
                Закрыть
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Наименование" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
              <input value={productForm.category} onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Категория" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <select value={productForm.unit} onChange={(e) => setProductForm((prev) => ({ ...prev, unit: e.target.value as Unit }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                <option value="">Единица измерения</option>
                <option value="л">л</option>
                <option value="кг">кг</option>
                <option value="шт">шт</option>
              </select>
              <input value={productForm.packSize} onChange={(e) => setProductForm((prev) => ({ ...prev, packSize: e.target.value }))} placeholder="Фасовка" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <input value={productForm.minStock} onChange={(e) => setProductForm((prev) => ({ ...prev, minStock: e.target.value }))} placeholder="Мин. остаток" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <input value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Цена" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
              <textarea value={productForm.notes} onChange={(e) => setProductForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Примечание" rows={4} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveProduct} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingProductId ? 'Сохранить изменения' : 'Добавить позицию'}</button>
              <button onClick={() => { setIsProductModalOpen(false); setEditingProductId(null); setProductForm(emptyProductDraft()) }} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
            </div>
          </div>
        </div>
      ) : null}

      {isContactModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/12 p-4 backdrop-blur-md">
          <div className={`${glass('w-full max-w-xl p-5')}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingContactId ? 'Редактирование контакта' : 'Новый контакт'}</h3>
                <p className="mt-1 text-sm text-slate-500">Справочник используется в техниках, расходах, осмотрах и поставках.</p>
              </div>
              <button
                onClick={() => {
                  setIsContactModalOpen(false)
                  setEditingContactId(null)
                  setContactForm(emptyContactDraft())
                }}
                className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl"
              >
                Закрыть
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={contactForm.name} onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Имя сотрудника / организация" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
              <select value={contactForm.kind} onChange={(e) => setContactForm((prev) => ({ ...prev, kind: e.target.value as ContactKind, position: e.target.value === 'supplier' ? '' : prev.position }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                <option value="person">Сотрудник</option>
                <option value="supplier">Поставщик</option>
              </select>
              {contactForm.kind === 'person' ? (
                <select
                  value={contactForm.position}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, position: e.target.value }))}
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                >
                  <option value="">Должность</option>
                  {CONTACT_POSITION_OPTIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              ) : (
                <input value="" readOnly placeholder="Должность" className="rounded-2xl border border-white/40 bg-white/20 px-4 py-3 text-slate-400 outline-none backdrop-blur-2xl" />
              )}
              <input value={contactForm.phone} onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Телефон" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <textarea value={contactForm.note} onChange={(e) => setContactForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Комментарий" rows={4} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveContact} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingContactId ? 'Сохранить изменения' : 'Добавить контакт'}</button>
              <button onClick={() => { setIsContactModalOpen(false); setEditingContactId(null); setContactForm(emptyContactDraft()) }} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
            </div>
          </div>
        </div>
      ) : null}

      {isVehicleDetailsOpen && selectedVehicle ? (
        <div className="fixed inset-0 z-50 bg-slate-900/14 p-3 backdrop-blur-md sm:p-5">
          <div className={`${glass('mx-auto flex h-[calc(100vh-24px)] w-full max-w-7xl flex-col p-5 sm:h-[calc(100vh-40px)] sm:p-6')}`}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{selectedVehicle.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedVehicle.plate || 'Без госномера'} · {selectedVehicle.type} · {selectedVehicle.responsible || 'Ответственный не указан'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMovementVehicleFilter(selectedVehicle.id)} className="rounded-2xl border border-white/60 bg-white/28 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl">Фильтр в журнале</button>
                <button onClick={() => { setEditingMovementId(null); setMovementForm((prev) => ({ ...prev, type: 'issue', productId: availableProductsForOutflow[0]?.id ?? '', vehicleId: selectedVehicle.id, counterparty: selectedVehicle.responsible || prev.counterparty, purposeKind: 'ТО', purposeSystem: prev.purposeSystem || 'Двигатель', purpose: composeMovementPurpose('ТО', prev.purposeSystem || 'Двигатель', 'Расход') })); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')]); setActiveTab('movements'); setIsVehicleDetailsOpen(false); setIsMovementFormOpen(true); setNotice('Форма расхода открыта для выбранной машины.') }} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl">Добавить расход</button>
                <button onClick={() => editVehicle(selectedVehicle)} className="rounded-2xl border border-sky-200/70 bg-sky-50/55 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl">Редактировать / интервалы ТО</button>
                <button onClick={() => setIsVehicleDetailsOpen(false)} className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl">Закрыть</button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Расход за 30 дней</div><div className="mt-1 font-semibold text-slate-900">{formatNumber(selectedVehicleLast30)} {selectedVehicleIssueUnitLabel}</div></div>
                    <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Предыдущие 30 дней</div><div className="mt-1 font-semibold text-slate-900">{formatNumber(selectedVehiclePrev30)} {selectedVehicleIssueUnitLabel}</div></div>
                    <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Операций расхода</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleIssues.length} шт.</div></div>
                    <div className={`rounded-2xl p-3 backdrop-blur-2xl ${selectedVehicleAnomaly ? 'bg-rose-50/45 text-rose-800' : 'bg-emerald-50/45 text-emerald-800'}`}><div className="text-current/70">Сигнал</div><div className="mt-1 font-semibold">{selectedVehicleAnomaly ? 'Нужна проверка' : 'Расход без явных отклонений'}</div></div>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div>
                      <h3 className="font-semibold text-slate-900">Нормы и следующее ТО</h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Интервал ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNorms?.intervalDays ?? '—'} дн.</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Индивидуальная норма ТО по моточасам / пробегу</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNorms ? `${formatNumber(selectedVehicleNorms.intervalRunHours)}${selectedVehicleNorms.runHoursUnit ? ` ${selectedVehicleNorms.runHoursUnit}` : ''}` : '—'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Фактический интервал между двумя ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.actualIntervalRunHours !== null && selectedVehicleNextTo?.actualIntervalRunHours !== undefined ? `${formatNumber(selectedVehicleNextTo.actualIntervalRunHours)}${selectedVehicleNextTo.runHoursUnit ? ` ${selectedVehicleNextTo.runHoursUnit}` : ''}` : 'Нет данных'}</div></div>
                        <div className={`rounded-2xl p-3 backdrop-blur-2xl ${selectedVehicleNextTo?.state === 'overdue' ? 'bg-rose-50/45 text-rose-800' : selectedVehicleNextTo?.state === 'soon' ? 'bg-amber-50/45 text-amber-800' : 'bg-emerald-50/45 text-emerald-800'}`}><div className="text-current/70">Следующее ТО</div><div className="mt-1 font-semibold">{selectedVehicleNextTo?.nextDate || 'Нет расчета'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Последнее ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.lastToDate || 'Нет данных'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Последние моточасы / пробег</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.currentRunHours !== null && selectedVehicleNextTo?.currentRunHours !== undefined ? `${formatNumber(selectedVehicleNextTo.currentRunHours)}${selectedVehicleNextTo.runHoursUnit ? ` ${selectedVehicleNextTo.runHoursUnit}` : ''}` : 'Нет данных'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Осталось до следующего ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.remainRunHours !== null && selectedVehicleNextTo?.remainRunHours !== undefined ? `${formatNumber(selectedVehicleNextTo.remainRunHours)}${selectedVehicleNextTo.runHoursUnit ? ` ${selectedVehicleNextTo.runHoursUnit}` : ''}` : 'Нет расчета'}</div></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Вероятные причины неисправности</h3>
                      <div className="mt-3 space-y-2">
                        {selectedVehicleLikelyIssues.length === 0 ? (
                          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Система не видит явных признаков неисправности по текущей истории расхода.</div>
                        ) : (
                          selectedVehicleLikelyIssues.map((issue) => (
                            <div key={issue.title} className={`rounded-2xl border p-3 text-sm backdrop-blur-2xl ${issue.severity === 'critical' ? 'border-rose-200/70 bg-rose-50/40 text-rose-900' : issue.severity === 'warning' ? 'border-amber-200/70 bg-amber-50/40 text-amber-900' : 'border-sky-200/70 bg-sky-50/40 text-sky-900'}`}>
                              <div className="font-semibold">{issue.title}</div>
                              <div className="mt-1 text-current/80">{issue.detail}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Сводка по маслам</h3>
                      <span className="text-sm text-slate-500">{selectedVehicleSummary.length} поз.</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehicleSummary.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">По этой машине пока нет выдач.</div>
                      ) : (
                        selectedVehicleSummary.slice(0, 12).map((item) => {
                          const isExpanded = expandedVehicleProductId === item.product.id
                          return (
                            <div key={item.product.id} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                              <button
                                type="button"
                                onClick={() => setExpandedVehicleProductId((prev) => (prev === item.product.id ? null : item.product.id))}
                                className="flex w-full items-start justify-between gap-3 text-left"
                              >
                                <div>
                                  <div className="font-medium text-slate-900">{item.product.name}</div>
                                  <div className="mt-1 text-xs text-slate-500">Операций: {item.operations} · Последняя выдача: {item.lastDate}</div>
                                  <div className="mt-2 text-xs text-sky-700">{isExpanded ? 'Скрыть историю выдач' : 'Показать, когда и на что выдавалось'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-900">{formatNumber(item.total)} {item.product.unit}</div>
                                  <div className="mt-2 text-xs text-slate-400">{isExpanded ? '−' : '+'}</div>
                                </div>
                              </button>

                              {isExpanded ? (
                                <div className="mt-3 space-y-2 rounded-2xl border border-slate-200/60 bg-sky-50/60 p-3 backdrop-blur-2xl">
                                  {expandedVehicleProduct && expandedVehicleProductMovements.length > 0 ? (
                                    expandedVehicleProductMovements.map((movement) => (
                                      <div key={movement.id} className="rounded-2xl border border-slate-200/60 bg-white/88 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="font-medium text-slate-900">{movement.purpose || 'Расход масла'}</div>
                                            <div className="mt-1 text-xs text-slate-500">{movement.date} · {movement.counterparty || 'Получатель не указан'}</div>
                                            {movement.runHours ? <div className="mt-1 text-xs text-slate-500">Пробег / моточасы: {movement.runHours}</div> : null}
                                            {movement.documentNo ? <div className="mt-1 text-xs text-slate-500">Документ: {movement.documentNo}</div> : null}
                                            {movement.note ? <div className="mt-1 text-xs text-slate-500">{movement.note}</div> : null}
                                          </div>
                                          <div className="text-right text-sm font-semibold text-slate-900">{formatNumber(Math.abs(movement.quantity))} {expandedVehicleProduct.unit}</div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded-2xl border border-slate-200/60 bg-white/84 p-3 text-sm text-slate-500">История по этому маслу пока не найдена.</div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">По системам</h3>
                      <span className="text-sm text-slate-500">{selectedVehicleSystemStats.length}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehicleSystemStats.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Система пока не смогла разложить расходы по узлам.</div>
                      ) : (
                        selectedVehicleSystemStats.map((item) => (
                          <div key={item.system} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">{item.label}</div>
                                <div className="mt-1 text-xs text-slate-500">Всего расхода: {formatNumber(item.total)} л / кг</div>
                              </div>
                              <div className="text-right text-sm text-slate-700">
                                <div>Доливов: <span className="font-semibold text-slate-900">{item.topUps} шт.</span></div>
                                <div className="mt-1">Норма долива: <span className="font-semibold text-slate-900">{item.limit > 0 ? `${formatNumber(item.limit)} л / кг` : 'не задана'}</span></div>
                              </div>
                            </div>
                            {item.topUps > 0 ? <div className="mt-2 text-xs text-slate-600">Сумма доливов: {formatNumber(item.topUpQty)} л / кг · максимальный долив: {formatNumber(item.maxTopUp)} л / кг</div> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">По типам работ</h3>
                      <span className="text-sm text-slate-500">{selectedVehiclePurposeSummary.length}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehiclePurposeSummary.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Типы работ пока не зафиксированы.</div>
                      ) : (
                        selectedVehiclePurposeSummary.slice(0, 12).map((item) => {
                          const isExpanded = expandedVehiclePurpose === item.purpose
                          return (
                            <div key={item.purpose} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                              <button
                                type="button"
                                onClick={() => setExpandedVehiclePurpose((prev) => (prev === item.purpose ? null : item.purpose))}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <div>
                                  <div className="font-medium text-slate-900">{item.purpose}</div>
                                  <div className="mt-1 text-xs text-sky-700">{isExpanded ? 'Скрыть историю расходов' : 'Показать, когда и что расходовалось'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-900">{formatNumber(item.total)}</div>
                                  <div className="mt-2 text-xs text-slate-400">{isExpanded ? '−' : '+'}</div>
                                </div>
                              </button>
                              {isExpanded ? (
                                <div className="mt-3 space-y-2 rounded-2xl border border-slate-200/60 bg-sky-50/60 p-3 backdrop-blur-2xl">
                                  {expandedVehiclePurposeMovements.map((movement) => (
                                    <div key={movement.id} className="rounded-2xl border border-slate-200/60 bg-white/88 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium text-slate-900">{productMap.get(movement.productId)?.name ?? '—'}</div>
                                          <div className="mt-1 text-xs text-slate-500">{movement.date} · {movement.counterparty || 'Получатель не указан'}</div>
                                          {movement.runHours ? <div className="mt-1 text-xs text-slate-500">Пробег / моточасы: {movement.runHours}</div> : null}
                                          {movement.note ? <div className="mt-1 text-xs text-slate-500">{movement.note}</div> : null}
                                        </div>
                                        <div className="text-right text-sm font-semibold text-slate-900">{formatNumber(Math.abs(movement.quantity))}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Последние операции</h3>
                      <span className="text-sm text-slate-500">{selectedVehicleMovements.length}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehicleMovements.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Операций по этой машине пока нет.</div>
                      ) : (
                        selectedVehicleMovements.slice(0, 16).map((movement) => {
                          const unit = productMap.get(movement.productId)?.unit ?? ''
                          const operationLabel = movement.type === 'receipt' ? 'Приход' : movement.type === 'issue' ? 'Расход' : 'Корректировка'
                          const productName = productMap.get(movement.productId)?.name ?? '—'

                          return (
                            <div key={movement.id} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-slate-900">{operationLabel}: {formatNumber(movement.quantity)} {unit}</div>
                                  <div className="mt-1 text-xs text-slate-700">Масло: {productName}</div>
                                  <div className="mt-1 text-xs text-slate-500">{movement.date} · {movement.purpose || operationLabel}</div>
                                  {movement.note ? <div className="mt-1 text-xs text-slate-500">{movement.note}</div> : null}
                                </div>
                                <div className={`rounded-full px-3 py-1 text-xs font-medium ${movement.type === 'issue' ? 'bg-rose-100/80 text-rose-700' : movement.type === 'receipt' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                                  {movement.type === 'issue' ? '−' : movement.type === 'receipt' ? '+' : '±'}{formatNumber(movement.quantity)} {unit}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">Осмотры и ремонт</h3>
                        <p className="mt-1 text-xs text-slate-500">Журнал решений механика по выбранной машине.</p>
                      </div>
                      <button onClick={() => openInspectionForVehicle(selectedVehicle.id, selectedVehicleAnomaly ? 'inspection' : 'observation')} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl">Добавить запись</button>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white/84 p-3 backdrop-blur-2xl">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="date" value={inspectionForm.date} onChange={(e) => setInspectionForm((prev) => ({ ...prev, date: e.target.value }))} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl" />
                        <select value={inspectionForm.stage} onChange={(e) => setInspectionForm((prev) => ({ ...prev, stage: e.target.value as InspectionStage }))} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl">
                          {INSPECTION_STAGE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <input list="people-list" value={inspectionForm.mechanic} onChange={(e) => setInspectionForm((prev) => ({ ...prev, mechanic: e.target.value }))} placeholder="Механик / ответственный" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                        <textarea value={inspectionForm.finding} onChange={(e) => setInspectionForm((prev) => ({ ...prev, finding: e.target.value }))} placeholder="Что обнаружено" rows={3} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                        <textarea value={inspectionForm.action} onChange={(e) => setInspectionForm((prev) => ({ ...prev, action: e.target.value }))} placeholder="Что сделано" rows={3} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                        <textarea value={inspectionForm.recommendation} onChange={(e) => setInspectionForm((prev) => ({ ...prev, recommendation: e.target.value }))} placeholder="Рекомендация / решение" rows={3} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={saveInspectionRecord} className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">Сохранить запись</button>
                        <button onClick={resetInspectionForm} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-2xl">Очистить</button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {selectedVehicleInspectionHistory.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">По этой машине пока нет записей осмотров или ремонта.</div>
                      ) : (
                        selectedVehicleInspectionHistory.slice(0, 12).map((record) => (
                          <div key={record.id} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">{INSPECTION_STAGE_OPTIONS.find((item) => item.value === record.stage)?.label}</div>
                                <div className="mt-1 text-xs text-slate-500">{record.date} · {record.mechanic || 'Механик не указан'}</div>
                              </div>
                              <span className="rounded-full bg-sky-100/80 px-3 py-1 text-xs font-medium text-sky-700">{REGISTRY_STATUS_OPTIONS.find((item) => item.value === (record.stage === 'repair' ? 'repair' : record.stage === 'closed' ? 'closed' : 'inspection'))?.label}</span>
                            </div>
                            {record.finding ? <div className="mt-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Обнаружено:</span> {record.finding}</div> : null}
                            {record.action ? <div className="mt-1 text-sm text-slate-700"><span className="font-medium text-slate-900">Сделано:</span> {record.action}</div> : null}
                            {record.recommendation ? <div className="mt-1 text-sm text-slate-700"><span className="font-medium text-slate-900">Решение:</span> {record.recommendation}</div> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dashboardStatusModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/18 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/50 px-6 py-5">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-sky-600/80">Статус техники</div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{VEHICLE_STATUSES.find((item) => item.value === dashboardStatusModal)?.label}</h3>
                <p className="mt-1 text-sm text-slate-500">Машины с этим статусом в текущем реестре.</p>
              </div>
              <button onClick={() => setDashboardStatusModal(null)} className="rounded-2xl border border-white/60 bg-white/45 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-2xl">Закрыть</button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="space-y-3">
                {dashboardStatusVehicles.length === 0 ? (
                  <div className="rounded-3xl border border-white/60 bg-white/38 p-5 text-sm text-slate-500 shadow-sm backdrop-blur-2xl">По этому статусу пока нет машин.</div>
                ) : (
                  dashboardStatusVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id)
                        setActiveTab('vehicles')
                        setIsVehicleDetailsOpen(true)
                        setDashboardStatusModal(null)
                      }}
                      className="w-full rounded-3xl border border-white/60 bg-white/40 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{vehicle.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{vehicle.type} · {vehicle.plate || 'Без номера'}</div>
                          <div className="mt-1 text-xs text-slate-400">{vehicle.responsible || 'Ответственный не указан'}</div>
                        </div>
                        <span className="rounded-full bg-sky-100/80 px-3 py-1 text-xs font-medium text-sky-700">Открыть</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <datalist id="recipient-list">
        {allRecipientNames.map((name) => <option key={name} value={name} />)}
      </datalist>
      <datalist id="people-list">
        {peopleNames.map((name) => <option key={name} value={name} />)}
      </datalist>
      <datalist id="supplier-list">
        {supplierNames.map((name) => <option key={name} value={name} />)}
      </datalist>
    </div>
  )
}

export default App
