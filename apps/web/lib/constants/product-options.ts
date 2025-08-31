import { ProductContainer, ProductUnit } from '@happy-bar/types'

export const PRODUCT_UNIT_OPTIONS = [
  { value: ProductUnit.ML, label: 'ml' },
  { value: ProductUnit.L, label: 'L' },
  { value: ProductUnit.FL_OZ, label: 'fl oz' },
  { value: ProductUnit.GAL, label: 'gal' },
  { value: ProductUnit.G, label: 'g' },
  { value: ProductUnit.KG, label: 'kg' },
  { value: ProductUnit.LB, label: 'lb' },
  { value: ProductUnit.COUNT, label: 'count' },
  { value: ProductUnit.CL, label: 'cl' },
  { value: ProductUnit.OZ, label: 'oz' },
]

export const PRODUCT_CONTAINER_OPTIONS = [
  { value: ProductContainer.CAN, label: 'Can' },
  { value: ProductContainer.BOTTLE, label: 'Bottle' },
  { value: ProductContainer.KEG, label: 'Keg' },
  { value: ProductContainer.BOX, label: 'Box' },
  { value: ProductContainer.BAG, label: 'Bag' },
  { value: ProductContainer.CARTON, label: 'Carton' },
  { value: ProductContainer.UNIT, label: 'Unit' },
  { value: ProductContainer.FIRKIN, label: 'Firkin' },
  { value: ProductContainer.CASK, label: 'Cask' },
  { value: ProductContainer.GROWLER, label: 'Growler' },
  { value: ProductContainer.MINI_KEG, label: 'Mini Keg' },
  { value: ProductContainer.POUCH, label: 'Pouch' },
  { value: ProductContainer.JAR, label: 'Jar' },
  { value: ProductContainer.BEER_BALL, label: 'Beer Ball' },
  { value: ProductContainer.RESERVED, label: 'Reserved' },
  { value: ProductContainer.DECANTER, label: 'Decanter' },
  { value: ProductContainer.CARTRIDGE, label: 'Cartridge' },
  { value: ProductContainer.FIASCO, label: 'Fiasco' },
  { value: ProductContainer.BUCKET, label: 'Bucket' },
  { value: ProductContainer.GLASS, label: 'Glass' },
]

// Generate serving unit options for product mappings
export const getServingUnitOptions = (
  productContainer?: ProductContainer | ProductContainer[] | null
) => {
  if (!productContainer) {
    return PRODUCT_UNIT_OPTIONS
  }
  if (Array.isArray(productContainer)) {
    return [
      ...productContainer.map((container) => ({
        value: `${
          PRODUCT_CONTAINER_OPTIONS.find((opt) => opt.value === container)
            ?.value || 'unit'
        }`,
        label:
          PRODUCT_CONTAINER_OPTIONS.find((opt) => opt.value === container)
            ?.label || 'Unit',
      })),
      ...PRODUCT_UNIT_OPTIONS,
    ]
  }
  return [
    {
      value: `${PRODUCT_CONTAINER_OPTIONS.find((opt) => opt.value === productContainer)?.value || 'unit'}`,
      label: productContainer
        ? `${PRODUCT_CONTAINER_OPTIONS.find((opt) => opt.value === productContainer)?.label || 'Unit'}`
        : 'Unit',
    },
    ...PRODUCT_UNIT_OPTIONS,
  ]
}

// Helper to format product display with unit and container
export const formatProductDisplay = (
  unitSize: number,
  unit: ProductUnit,
  container?: ProductContainer | null
) => {
  const containerLabel = container
    ? PRODUCT_CONTAINER_OPTIONS.find((opt) => opt.value === container)?.label
    : null

  if (containerLabel && container !== ProductContainer.UNIT) {
    return `${unitSize}${unit} ${containerLabel.toLowerCase()}`
  }

  return `${unitSize}${unit}`
}

// Helper to get serving unit display name
export const getServingUnitDisplay = (
  servingUnit: string,
  productContainer?: ProductContainer | null
) => {
  if (servingUnit === 'container') {
    return productContainer
      ? PRODUCT_CONTAINER_OPTIONS.find((opt) => opt.value === productContainer)
          ?.label || 'Container'
      : 'Unit'
  }

  return (
    PRODUCT_UNIT_OPTIONS.find((opt) => opt.value === servingUnit)?.label ||
    servingUnit
  )
}
