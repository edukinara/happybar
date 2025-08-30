import { apiClient } from './client'

interface APIRes<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export interface SupplierContact {
  id: string
  supplierId: string
  name: string
  title?: string
  email?: string
  phone?: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  organizationId: string
  name: string
  accountNumber?: string
  address?: string
  terms?: string
  isActive: boolean
  orderCutoffTime?: string
  orderCutoffDays: number[]
  deliveryDays: number[]
  deliveryTimeStart?: string
  deliveryTimeEnd?: string
  minimumOrderValue?: number
  deliveryFee?: number
  createdAt: string
  updatedAt: string
  contacts?: SupplierContact[]
  _count?: {
    orders: number
    products: number
    contacts: number
  }
  products?: ProductSupplier[]
}

export interface ProductSupplier {
  id: string
  productId: string
  supplierId: string
  supplierSku?: string
  orderingUnit: 'UNIT' | 'CASE'
  costPerUnit: number
  costPerCase?: number
  minimumOrder: number
  minimumOrderUnit?: 'UNIT' | 'CASE'
  packSize?: number
  leadTimeDays: number
  isPreferred: boolean
  supplier?: {
    id: string
    name: string
    isActive: boolean
  }
  product?: {
    id: string
    name: string
    sku?: string
    category?: {
      id: string
      name: string
    }
    container: string | null
    caseSize: number
    costPerCase: number | null
  }
}

export interface CreateSupplierRequest {
  name: string
  accountNumber?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  terms?: string
  isActive?: boolean
  orderCutoffTime?: string
  orderCutoffDays?: number[]
  deliveryDays?: number[]
  deliveryTimeStart?: string
  deliveryTimeEnd?: string
  minimumOrderValue?: number
  deliveryFee?: number
  contacts?: {
    name: string
    title?: string
    email?: string
    phone?: string
    isPrimary?: boolean
  }[]
}

export interface UpdateSupplierRequest {
  name?: string
  accountNumber?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  terms?: string
  isActive?: boolean
  orderCutoffTime?: string
  orderCutoffDays?: number[]
  deliveryDays?: number[]
  deliveryTimeStart?: string
  deliveryTimeEnd?: string
  minimumOrderValue?: number
  deliveryFee?: number
  contacts?: {
    id?: string
    name: string
    title?: string
    email?: string
    phone?: string
    isPrimary?: boolean
  }[]
}

export interface CreateProductSupplierRequest {
  productId: string
  supplierSku?: string
  orderingUnit: 'UNIT' | 'CASE'
  costPerUnit: number
  costPerCase?: number
  minimumOrder: number
  minimumOrderUnit?: 'UNIT' | 'CASE'
  packSize?: number
  leadTimeDays?: number
  isPreferred: boolean
}

export interface UpdateProductSupplierRequest {
  supplierSku?: string
  orderingUnit?: 'UNIT' | 'CASE'
  costPerUnit?: number
  costPerCase?: number
  minimumOrder?: number
  minimumOrderUnit?: 'UNIT' | 'CASE'
  packSize?: number
  leadTimeDays?: number
  isPreferred?: boolean
}

export const suppliersApi = {
  async getSuppliers(params?: {
    active?: boolean
    search?: string
    excludeProducts?: boolean
  }): Promise<Supplier[]> {
    const queryParams = new URLSearchParams()
    if (params?.active !== undefined) {
      queryParams.append('active', params.active.toString())
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }
    if (params?.excludeProducts !== undefined) {
      queryParams.append('excludeProducts', params.excludeProducts.toString())
    }

    const url = `/api/suppliers${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await apiClient.get<APIRes<Supplier[]>>(url)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get suppliers')
    }
    return response.data
  },

  async getSupplier(id: string): Promise<Supplier> {
    const response = await apiClient.get<APIRes<Supplier>>(
      `/api/suppliers/${id}`
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get supplier')
    }
    return response.data
  },

  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.post<APIRes<Supplier>>(
      '/api/suppliers',
      data
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create supplier')
    }
    return response.data
  },

  async updateSupplier(
    id: string,
    data: UpdateSupplierRequest
  ): Promise<Supplier> {
    const response = await apiClient.put<APIRes<Supplier>>(
      `/api/suppliers/${id}`,
      data
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update supplier')
    }
    return response.data
  },

  async deleteSupplier(id: string): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(
      `/api/suppliers/${id}`
    )

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete supplier')
    }
  },

  // Product-Supplier relationships
  async getProductSuppliers(params?: {
    productId?: string
  }): Promise<ProductSupplier[]> {
    const queryParams = new URLSearchParams()
    if (params?.productId) {
      queryParams.append('productId', params.productId)
    }

    const url = `/api/suppliers/products${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await apiClient.get<APIRes<ProductSupplier[]>>(url)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get product suppliers')
    }
    return response.data
  },

  async getSupplierProducts(supplierId: string): Promise<ProductSupplier[]> {
    const response = await apiClient.get<APIRes<ProductSupplier[]>>(
      `/api/suppliers/${supplierId}/products`
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get supplier products')
    }
    return response.data
  },

  async addProductToSupplier(
    supplierId: string,
    data: CreateProductSupplierRequest
  ): Promise<ProductSupplier> {
    const response = await apiClient.post<APIRes<ProductSupplier>>(
      `/api/suppliers/${supplierId}/products`,
      data
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add product to supplier')
    }
    return response.data
  },

  async updateProductSupplier(
    supplierId: string,
    productId: string,
    data: UpdateProductSupplierRequest
  ): Promise<ProductSupplier> {
    const response = await apiClient.put<APIRes<ProductSupplier>>(
      `/api/suppliers/${supplierId}/products/${productId}`,
      data
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update product supplier')
    }
    return response.data
  },

  async removeProductFromSupplier(
    supplierId: string,
    productId: string
  ): Promise<void> {
    const response = await apiClient.delete<APIRes<{ message: string }>>(
      `/api/suppliers/${supplierId}/products/${productId}`
    )

    if (!response.success) {
      throw new Error(
        response.error || 'Failed to remove product from supplier'
      )
    }
  },
}
