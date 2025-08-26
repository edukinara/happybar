// Toast Menus API v2 TypeScript Types
// Generated from OpenAPI specification

// Enums
export enum PricingStrategy {
  BASE_PRICE = 'BASE_PRICE',
  MENU_SPECIFIC_PRICE = 'MENU_SPECIFIC_PRICE',
  TIME_SPECIFIC_PRICE = 'TIME_SPECIFIC_PRICE',
  SIZE_PRICE = 'SIZE_PRICE',
  OPEN_PRICE = 'OPEN_PRICE',
  SEQUENCE_PRICE = 'SEQUENCE_PRICE',
  SIZE_SEQUENCE_PRICE = 'SIZE_SEQUENCE_PRICE',
  GROUP_PRICE = 'GROUP_PRICE',
  NONE = 'NONE',
}

export enum TaxInclusion {
  TAX_INCLUDED = 'TAX_INCLUDED',
  TAX_NOT_INCLUDED = 'TAX_NOT_INCLUDED',
  SMART_TAX = 'SMART_TAX',
}

export enum UnitOfMeasure {
  NONE = 'NONE',
  LB = 'LB',
  OZ = 'OZ',
  KG = 'KG',
  G = 'G',
}

export enum DimensionUnitOfMeasure {
  IN = 'IN',
  CM = 'CM',
  FT = 'FT',
  M = 'M',
  MM = 'MM',
  YD = 'YD',
}

export enum WeightUnitOfMeasure {
  NONE = 'NONE',
  LB = 'LB',
  OZ = 'OZ',
  KG = 'KG',
  G = 'G',
}

export enum DefaultOptionsChargePrice {
  NO = 'NO',
  YES = 'YES',
}

export enum DefaultOptionsSubstitutionPricing {
  NO = 'NO',
  YES = 'YES',
}

export enum RequiredMode {
  REQUIRED = 'REQUIRED',
  OPTIONAL_FORCE_SHOW = 'OPTIONAL_FORCE_SHOW',
  OPTIONAL = 'OPTIONAL',
}

export enum DisplayMode {
  PREFIX = 'PREFIX',
  SUFFIX = 'SUFFIX',
}

export enum DayOfWeek {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

export enum Visibility {
  POS = 'POS',
  KIOSK = 'KIOSK',
  GRUBHUB = 'GRUBHUB',
  TOAST_ONLINE_ORDERING = 'TOAST_ONLINE_ORDERING',
  ORDERING_PARTNERS = 'ORDERING_PARTNERS',
}

export enum AlcoholContent {
  YES = 'YES',
  NO = 'NO',
}

// Base Types
export interface Metadata {
  restaurantGuid: string
  lastUpdated: string
}

export interface TimeRange {
  start: string
  end: string
}

export interface Schedule {
  days: DayOfWeek[]
  timeRanges: TimeRange[]
}

export interface Availability {
  alwaysAvailable: boolean
  schedule?: Schedule[]
}

export interface SalesCategory {
  name: string
  guid: string
}

export interface ItemTag {
  name: string
  guid: string
}

export interface Alcohol {
  containsAlcohol: AlcoholContent | null
}

export interface ContentAdvisories {
  alcohol: Alcohol
}

export interface SequencePrice {
  sequence: number
  price: number
}

export interface SizeSequencePricingRule {
  sizeName: string | null
  sizeGuid: string | null
  sequencePrices: SequencePrice[]
}

export interface TimeSpecificPrice {
  timeSpecificPrice: number
  basePrice: number
  schedule: Schedule[]
}

export interface PricingRules {
  timeSpecificPricingRules: TimeSpecificPrice[]
  sizeSpecificPricingGuid: string | null
  sizeSequencePricingRules: SizeSequencePricingRule[]
}

export interface ModifierOptionTaxInfo {
  taxRateGuids: string[]
  overrideItemTaxRates: boolean
}

export interface PreModifier {
  name: string
  guid: string
  multiLocationId?: string
  fixedPrice: number | null
  multiplicationFactor: number | null
  displayMode: DisplayMode
  posName?: string
  posButtonColorLight?: string
  posButtonColorDark?: string
}

export interface PreModifierGroup {
  name: string
  guid: string
  multiLocationId?: string
  preModifiers: PreModifier[]
}

export interface Portion {
  name: string
  guid: string
  modifierGroupReferences: number[]
}

export interface ModifierOption {
  referenceId: number
  name: string
  kitchenName: string
  guid: string
  multiLocationId?: string
  masterId?: number
  description?: string
  posName?: string
  posButtonColorLight?: string
  posButtonColorDark?: string
  prepStations: string[]
  image: string | null
  visibility: Visibility[]
  price: number | null
  pricingStrategy: PricingStrategy
  pricingRules: PricingRules | null
  salesCategory?: SalesCategory
  taxInfo: string[]
  modifierOptionTaxInfo?: ModifierOptionTaxInfo
  itemTags: ItemTag[]
  plu: string
  sku: string
  calories: number | null
  contentAdvisories?: ContentAdvisories
  unitOfMeasure: UnitOfMeasure
  isDefault: boolean
  allowsDuplicates: boolean
  portions: Portion[]
  prepTime: number | null
  modifierGroupReferences: number[]
  length: number | null
  height: number | null
  width: number | null
  dimensionUnitOfMeasure: DimensionUnitOfMeasure | null
  weight: number | null
  weightUnitOfMeasure: WeightUnitOfMeasure | null
  images: string[]
  guestCount: number | null
}

export interface ModifierGroup {
  name: string
  guid: string
  referenceId: number
  multiLocationId?: string
  masterId?: number
  posName?: string
  posButtonColorLight?: string
  posButtonColorDark?: string
  visibility: Visibility[]
  pricingStrategy: PricingStrategy
  pricingRules: PricingRules | null
  defaultOptionsChargePrice: DefaultOptionsChargePrice
  defaultOptionsSubstitutionPricing: DefaultOptionsSubstitutionPricing
  minSelections: number
  maxSelections: number | null
  requiredMode: RequiredMode
  isMultiSelect: boolean
  preModifierGroupReference?: number
  modifierOptionReferences: number[]
}

export interface MenuItem {
  name: string
  kitchenName: string
  guid: string
  multiLocationId?: string
  masterId?: number
  description?: string
  posName?: string
  posButtonColorLight?: string
  posButtonColorDark?: string
  image: string | null
  visibility: Visibility[]
  price: number | null
  pricingStrategy: PricingStrategy
  pricingRules: PricingRules | null
  isDeferred: boolean
  isDiscountable: boolean
  salesCategory?: SalesCategory
  taxInfo: string[]
  taxInclusion: TaxInclusion
  itemTags: ItemTag[]
  plu: string
  sku: string
  calories: number | null
  contentAdvisories?: ContentAdvisories
  unitOfMeasure: UnitOfMeasure
  portions: Portion[]
  prepTime: number | null
  prepStations: string[]
  modifierGroupReferences: number[]
  eligiblePaymentAssistancePrograms: string[]
  length: number | null
  height: number | null
  width: number | null
  dimensionUnitOfMeasure: DimensionUnitOfMeasure | null
  weight: number | null
  weightUnitOfMeasure: WeightUnitOfMeasure | null
  images: string[]
  guestCount: number | null
}

export interface MenuGroup {
  name: string
  guid: string
  multiLocationId?: string
  masterId?: number
  description?: string
  posName?: string
  posButtonColorLight?: string
  posButtonColorDark?: string
  image: string | null
  visibility: Visibility[]
  itemTags: ItemTag[]
  menuGroups: MenuGroup[]
  menuItems: MenuItem[]
}

export interface Menu {
  name: string
  guid: string
  multiLocationId?: string
  masterId?: number
  description?: string
  posName?: string
  posButtonColorLight?: string
  posButtonColorDark?: string
  highResImage: string | null
  image: string | null
  visibility: Visibility[]
  availability: Availability
  menuGroups: MenuGroup[]
}

export interface Restaurant {
  restaurantGuid: string
  lastUpdated: string
  restaurantTimeZone: string
  menus: Menu[]
  modifierGroupReferences: Record<string, ModifierGroup>
  modifierOptionReferences: Record<string, ModifierOption>
  preModifierGroupReferences: Record<string, PreModifierGroup>
}

// API Response Types
export interface MenusResponse extends Restaurant {}

export interface MetadataResponse extends Metadata {}

// API Parameters
export interface MenusGetParams {
  'Toast-Restaurant-External-ID': string
}

export interface MetadataGetParams {
  'Toast-Restaurant-External-ID': string
}

// Helper types for working with references
export type ModifierGroupReference = {
  [K in keyof ModifierGroup]: ModifierGroup[K]
} & {
  referenceId: number
}

export type ModifierOptionReference = {
  [K in keyof ModifierOption]: ModifierOption[K]
} & {
  referenceId: number
}

export type PreModifierGroupReference = {
  [K in keyof PreModifierGroup]: PreModifierGroup[K]
} & {
  referenceId: number
}

// Utility types for easier access to referenced entities
export type ModifierGroupReferences = Record<string, ModifierGroup>
export type ModifierOptionReferences = Record<string, ModifierOption>
export type PreModifierGroupReferences = Record<string, PreModifierGroup>

// Type guards for pricing strategies
export const isPricingStrategy = (value: string): value is PricingStrategy => {
  return Object.values(PricingStrategy).includes(value as PricingStrategy)
}

export const isVisibility = (value: string): value is Visibility => {
  return Object.values(Visibility).includes(value as Visibility)
}

// Helper type for working with menu hierarchies
export type MenuEntity = Menu | MenuGroup | MenuItem

// Type for flattened menu items (useful for search/filtering)
export interface FlattenedMenuItem extends MenuItem {
  menuPath: string[]
  menuGroupPath: string[]
}

// OAuth2 scope type
export type OAuth2Scope = 'menus:read'
