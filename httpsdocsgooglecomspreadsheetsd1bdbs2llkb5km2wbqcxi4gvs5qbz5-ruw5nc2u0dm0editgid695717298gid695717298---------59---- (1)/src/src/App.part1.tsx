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
