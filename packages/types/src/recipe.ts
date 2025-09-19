export interface Recipe {
  id: string
  organizationId: string
  name: string
  yield: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  items: RecipeItem[]
  totalCost?: number
  costPerServing?: number
}

export interface RecipeItem {
  id: string
  recipeId: string
  productId: string
  quantity: number
  createdAt: Date
  updatedAt: Date
  product: {
    id: string
    name: string
    unit: string
    costPerUnit: number
    container?: string
  }
}

export interface CreateRecipeRequest {
  name: string
  yield?: number
  isActive?: boolean
  items: {
    productId: string
    quantity: number
    unit?: string // Optional unit for conversion
  }[]
}

export interface UpdateRecipeRequest {
  name?: string
  yield?: number
  isActive?: boolean
  items?: {
    productId: string
    quantity: number
    unit?: string // Optional unit for conversion
  }[]
}

export interface RecipeCostBreakdown {
  recipe: {
    id: string
    name: string
    yield: number
  }
  breakdown: {
    productId: string
    productName: string
    quantity: number
    unit: string
    costPerUnit: number
    totalCost: number
    container?: string
  }[]
  summary: {
    totalCost: number
    costPerServing: number
    ingredientCount: number
  }
}

export interface RecipesResponse {
  recipes: Recipe[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface RecipeSearchParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export interface RecipePOSMapping {
  id: string
  organizationId: string
  recipeId: string
  posProductId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  recipe: {
    id: string
    name: string
  }
  posProduct: {
    id: string
    name: string
    externalId: string
    category: string | null
    price: number | null
  }
}

export interface CreateRecipePOSMappingRequest {
  recipeId: string
  posProductId: string
  isActive?: boolean
}

export interface UpdateRecipePOSMappingRequest {
  isActive?: boolean
  recipeId?: string
  posProductId?: string
}

export interface RecipePOSMappingsResponse {
  mappings: RecipePOSMapping[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
