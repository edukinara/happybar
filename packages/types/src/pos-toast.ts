export interface ToastRestaurant {
  guid: string
  general: ToastRestaurantGeneral
  urls: ToastRestaurantUrls
  location: ToastRestaurantLocation
  schedules: ToastRestaurantSchedules
  delivery: ToastRestaurantDelivery
  onlineOrdering: ToastRestaurantOnlineOrdering
  prepTimes: ToastRestaurantPrepTimes
}

export interface ToastRestaurantGeneral {
  name: string
  locationName: string
  locationCode: string
  description: string
  timeZone: string
  closeoutHour: number
  managementGroupGuid: string
  currencyCode: string
  firstBusinessDate: number
  archived: boolean
}

export interface ToastRestaurantUrls {
  website: string
  facebook: string
  twitter: string
  orderOnline: string
  purchaseGiftCard: string
  checkGiftCard: string
}

export interface ToastRestaurantLocation {
  address1: string
  address2: string
  city: string
  stateCode: string
  administrativeArea: string
  zipCode: string
  country: string
  phone: string
  phoneCountryCode: string
  latitude: number
  longitude: number
}

export interface ToastRestaurantSchedules {
  daySchedules: ToastRestaurantDaySchedules
  weekSchedule: ToastRestaurantWeekSchedule
}

export interface ToastRestaurantDaySchedules {
  identifier: string
  property1: ToastRestaurantProperty
  property2: ToastRestaurantProperty
}

export interface ToastRestaurantProperty {
  scheduleName: string
  services: ToastRestaurantService[]
  openTime: string
  closeTime: string
}

export interface ToastRestaurantService {
  name: string
  hours: ToastRestaurantHours
  overnight: boolean
}

export interface ToastRestaurantHours {
  startTime: string
  endTime: string
}

export interface ToastRestaurantProperty {
  scheduleName: string
  services: ToastRestaurantService[]
  openTime: string
  closeTime: string
}

export interface ToastRestaurantWeekSchedule {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface ToastRestaurantDelivery {
  enabled: boolean
  minimum: number
  area: string
}

export interface ToastRestaurantOnlineOrdering {
  enabled: boolean
  scheduling: boolean
  specialRequests: boolean
  specialRequestsMessage: string
  paymentOptions: ToastRestaurantPaymentOptions
}

export interface ToastRestaurantPaymentOptions {
  delivery: ToastRestaurantDelivery
  takeout: ToastRestaurantTakeout
  ccTip: boolean
}

export interface ToastRestaurantTakeout {
  cash: boolean
  ccSameDay: boolean
  ccFuture: boolean
  ccInStore: boolean
}

export interface ToastRestaurantPrepTimes {
  deliveryPrepTime: number
  deliveryTimeAfterOpen: number
  deliveryTimeBeforeClose: number
  takeoutPrepTime: number
  takeoutTimeAfterOpen: number
  takeoutTimeBeforeClose: number
  takeoutThrottlingTime: number
  deliveryThrottlingTime: number
}

export interface ToastOrder {
  guid: string
  entityType: string
  externalId: string
  openedDate: string
  modifiedDate: string
  promisedDate: string
  channelGuid: string
  diningOption: ToastDiningOption
  checks: ToastCheck[]
  table: ToastTable
  serviceArea: ToastServiceArea
  restaurantService: ToastRestaurantService
  revenueCenter: ToastRevenueCenter
  source: string
  duration: number
  deliveryInfo: ToastDeliveryInfo
  requiredPrepTime: string
  estimatedFulfillmentDate: string
  numberOfGuests: number
  voided: boolean
  voidDate: string
  voidBusinessDate: number
  paidDate: string
  closedDate: string
  deletedDate: string
  deleted: boolean
  businessDate: number
  server: ToastServer
  pricingFeatures: string[]
  approvalStatus: string
  guestOrderStatus: string
  createdDevice: ToastCreatedDevice
  createdDate: string
  initialDate: number
  lastModifiedDevice: ToastLastModifiedDevice
  curbsidePickupInfo: ToastCurbsidePickupInfo
  deliveryServiceInfo: ToastDeliveryServiceInfo
  marketplaceFacilitatorTaxInfo: ToastMarketplaceFacilitatorTaxInfo
  createdInTestMode: boolean
  appliedPackagingInfo: ToastAppliedPackagingInfo
  excessFood: boolean
  displayNumber: string
}

export interface ToastDiningOption {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastCheck {
  guid: string
  entityType: string
  externalId: string
  createdDate: string
  openedDate: string
  closedDate: string
  modifiedDate: string
  deletedDate: string
  deleted: boolean
  selections: ToastSelection[]
  customer: ToastCustomer
  appliedLoyaltyInfo: ToastAppliedLoyaltyInfo
  taxExempt: boolean
  displayNumber: string
  appliedServiceCharges: ToastAppliedServiceCharge[]
  amount: number
  taxAmount: number
  totalAmount: number
  payments: ToastPayment[]
  tabName: string
  paymentStatus: string
  appliedDiscounts: ToastAppliedDiscount[]
  voided: boolean
  voidDate: string
  voidBusinessDate: number
  paidDate: string
  createdDevice: ToastCreatedDevice
  lastModifiedDevice: ToastLastModifiedDevice
  duration: number
  openedBy: ToastOpenedBy
}

export interface ToastSelection {
  guid: string
  entityType: string
  externalId: string
  item: ToastItem
  itemGroup: ToastItemGroup
  optionGroup: ToastOptionGroup
  preModifier: ToastPreModifier
  quantity: number
  seatNumber: number
  unitOfMeasure: string
  selectionType: string
  salesCategory: ToastSalesCategory
  appliedDiscounts: ToastAppliedDiscount[]
  deferred: boolean
  preDiscountPrice: number
  price: number
  tax: number
  voided: boolean
  voidDate: string
  voidBusinessDate: number
  voidReason: ToastVoidReason
  refundDetails: ToastRefundDetails
  displayName: string
  createdDate: string
  modifiedDate: string
  modifiers: ToastModifier[]
  fulfillmentStatus: string
  taxInclusion: string
  appliedTaxes: ToastAppliedTax[]
  diningOption: ToastDiningOption
  openPriceAmount: number
  receiptLinePrice: number
  optionGroupPricingMode: string
  externalPriceAmount: number
  splitOrigin: ToastSplitOrigin
}

export interface ToastItem {
  guid: string
  entityType: string
  multiLocationId: string
  externalId: string
}

export interface ToastItemGroup {
  guid: string
  entityType: string
  multiLocationId: string
  externalId: string
}

export interface ToastOptionGroup {
  guid: string
  entityType: string
  multiLocationId: string
  externalId: string
}

export interface ToastPreModifier {
  guid: string
  entityType: string
  multiLocationId: string
  externalId: string
}

export interface ToastSalesCategory {
  guid: string
  entityType: string
  multiLocationId: string
  externalId: string
}

export interface ToastAppliedDiscount {
  guid: any
  entityType: any
  externalId: any
  name: any
  discountAmount: any
  nonTaxDiscountAmount: any
  discount: any
  triggers: any[]
  approver: any
  processingState: any
  appliedDiscountReason: any
  loyaltyDetails: any
  comboItems: any[]
  appliedPromoCode: any
  discountType: any
  discountPercent: any
}

export interface ToastVoidReason {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastRefundDetails {
  refundAmount: number
  taxRefundAmount: number
  refundTransaction: ToastRefundTransaction
}

export interface ToastRefundTransaction {
  guid: any
  entityType: any
}

export interface ToastModifier {}

export interface ToastAppliedTax {
  guid: any
  entityType: any
  taxRate: any
  name: any
  rate: any
  taxAmount: any
  type: any
  facilitatorCollectAndRemitTax: any
  displayName: any
  jurisdiction: any
  jurisdictionType: any
}

export interface ToastSplitOrigin {
  guid: string
  entityType: string
}

export interface ToastCustomer {
  guid: string
  entityType: string
  firstName: string
  lastName: string
  phone: string
  phoneCountryCode: string
  email: string
}

export interface ToastAppliedLoyaltyInfo {
  guid: string
  entityType: string
  loyaltyIdentifier: string
  maskedLoyaltyIdentifier: string
  vendor: string
  accrualFamilyGuid: string
  accrualText: string
}

export interface ToastAppliedServiceCharge {
  guid: string
  entityType: string
  externalId: string
  chargeAmount: number
  serviceCharge: ToastServiceCharge
  chargeType: string
  name: string
  delivery: boolean
  takeout: boolean
  dineIn: boolean
  gratuity: boolean
  taxable: boolean
  appliedTaxes: ToastAppliedTax[]
  serviceChargeCalculation: string
  refundDetails: ToastRefundDetails
  serviceChargeCategory: string
  paymentGuid: string
}

export interface ToastServiceCharge {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastPayment {
  guid: string
  entityType: string
  externalId: string
  paidDate: string
  paidBusinessDate: number
  type: string
  cardEntryMode: string
  amount: number
  tipAmount: number
  amountTendered: number
  cardType: string
  last4Digits: string
  originalProcessingFee: number
  server: ToastServer
  cashDrawer: ToastCashDrawer
  refundStatus: string
  refund: ToastRefund
  paymentStatus: string
  voidInfo: ToastVoidInfo
  houseAccount: ToastHouseAccount
  otherPayment: ToastOtherPayment
  createdDevice: ToastCreatedDevice
  lastModifiedDevice: ToastLastModifiedDevice
  mcaRepaymentAmount: number
  cardPaymentId: string
  orderGuid: string
  checkGuid: string
  tenderTransactionGuid: string
}

export interface ToastServer {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastCashDrawer {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastRefund {
  refundAmount: number
  tipRefundAmount: number
  refundDate: string
  refundBusinessDate: number
  refundTransaction: ToastRefundTransaction
}

export interface ToastVoidInfo {
  voidUser: ToastVoidUser
  voidApprover: ToastVoidApprover
  voidDate: string
  voidBusinessDate: number
  voidReason: ToastVoidReason
}

export interface ToastVoidUser {
  guid: any
  entityType: any
  externalId: any
}

export interface ToastVoidApprover {
  guid: any
  entityType: any
  externalId: any
}

export interface ToastHouseAccount {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastOtherPayment {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastCreatedDevice {
  id: string
}

export interface ToastLastModifiedDevice {
  id: string
}

export interface ToastDiscount {
  guid: string
  entityType: string
}

export interface ToastTrigger {
  selection: any
  quantity: any
}

export interface ToastApprover {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastAppliedDiscountReason {
  name: string
  description: string
  comment: string
  discountReason: ToastDiscountReason
}

export interface ToastDiscountReason {
  guid: any
  entityType: any
}

export interface ToastLoyaltyDetails {
  vendor: string
  referenceId: string
}

export interface ToastComboItem {
  guid: any
  entityType: any
  externalId: any
}

export interface ToastOpenedBy {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastTable {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastServiceArea {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastRestaurantService {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastRevenueCenter {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastDeliveryInfo {
  address1: string
  address2: string
  city: string
  administrativeArea: string
  state: string
  zipCode: string
  country: string
  latitude: number
  longitude: number
  notes: string
  deliveredDate: string
  dispatchedDate: string
  deliveryEmployee: ToastDeliveryEmployee
  deliveryState: string
}

export interface ToastDeliveryEmployee {
  guid: string
  entityType: string
  externalId: string
}

export interface ToastCurbsidePickupInfo {
  guid: string
  entityType: string
  transportColor: string
  transportDescription: string
  notes: string
}

export interface ToastDeliveryServiceInfo {
  guid: string
  entityType: string
  providerId: string
  providerName: string
  driverName: string
  driverPhoneNumber: string
  providerInfo: string
  originalQuotedDeliveryDate: string
}

export interface ToastMarketplaceFacilitatorTaxInfo {
  facilitatorCollectAndRemitTaxOrder: boolean
  taxes: ToastTax[]
}

export interface ToastTax {
  guid: string
  entityType: string
  taxRate: ToastTaxRate
  name: string
  rate: number
  taxAmount: number
  type: string
  facilitatorCollectAndRemitTax: boolean
  displayName: string
  jurisdiction: string
  jurisdictionType: string
}

export interface ToastTaxRate {
  guid: string
  entityType: string
}

export interface ToastAppliedPackagingInfo {
  guid: string
  entityType: string
  appliedPackagingItems: ToastAppliedPackagingItem[]
}

export interface ToastAppliedPackagingItem {
  guid: string
  entityType: string
  itemConfigId: string
  inclusion: string
  itemTypes: string[]
  guestDisplayName: string
}
