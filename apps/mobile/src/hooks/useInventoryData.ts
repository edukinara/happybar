import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

// Types for inventory data
export interface Product {
  id: string;
  name: string;
  sku?: string;
  upc?: string;
  categoryId: string;
  unit: string;
  container: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface InventoryLevel {
  id: string;
  productId: string;
  locationId: string;
  currentQuantity: number;
  parLevel?: number;
  maxLevel?: number;
  reorderPoint?: number;
  updatedAt: string;
  product?: Product;
}

export interface LowStockItem {
  id: string;
  productId: string;
  locationId: string;
  currentQuantity: number;
  parLevel: number;
  shortage: number;
  product: Product;
}

export interface InventoryCount {
  id: string;
  locationId: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  createdBy: string;
  itemsCount: number;
  completedItemsCount: number;
}

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  product: (id: string) => [...inventoryKeys.products(), id] as const,
  levels: () => [...inventoryKeys.all, 'levels'] as const,
  lowStock: () => [...inventoryKeys.all, 'low-stock'] as const,
  counts: () => [...inventoryKeys.all, 'counts'] as const,
  count: (id: string) => [...inventoryKeys.counts(), id] as const,
};

// Products hooks
export const useProducts = () => {
  return useQuery({
    queryKey: inventoryKeys.products(),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Product[] }>('/api/inventory/products');
      return response.data;
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Product }>(`/api/inventory/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Inventory levels hooks
export const useInventoryLevels = () => {
  return useQuery({
    queryKey: inventoryKeys.levels(),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: InventoryLevel[] }>('/api/inventory/levels');
      return response.data;
    },
  });
};

// Low stock items
export const useLowStockItems = () => {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: LowStockItem[] }>('/api/inventory/low-stock');
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Inventory counts
export const useInventoryCounts = () => {
  return useQuery({
    queryKey: inventoryKeys.counts(),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: InventoryCount[] }>('/api/inventory/counts');
      return response.data;
    },
  });
};

export const useInventoryCount = (id: string) => {
  return useQuery({
    queryKey: inventoryKeys.count(id),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: InventoryCount }>(`/api/inventory/counts/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Mutations
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await apiClient.post<{ success: boolean; data: Product }>('/api/inventory/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await apiClient.put<{ success: boolean; data: Product }>(`/api/inventory/products/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.product(data.id) });
    },
  });
};

export const useUpdateInventoryLevel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { productId: string; locationId: string; quantity: number }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>('/api/inventory/levels', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.levels() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
};

export const useStartInventoryCount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { locationId: string }) => {
      const response = await apiClient.post<{ success: boolean; data: InventoryCount }>('/api/inventory/counts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.counts() });
    },
  });
};