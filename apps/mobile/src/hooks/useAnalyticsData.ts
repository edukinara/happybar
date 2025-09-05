import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

// Types for analytics data
export interface InventoryAnalytics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  turnoverRate: number;
  wastePercentage: number;
  topMovingProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    value: number;
    percentage: number;
  }>;
}

export interface VarianceAnalytics {
  totalVariance: number;
  variancePercentage: number;
  positiveVariance: number;
  negativeVariance: number;
  topVarianceItems: Array<{
    productId: string;
    productName: string;
    expected: number;
    actual: number;
    variance: number;
    varianceValue: number;
  }>;
}

export interface PurchasingAnalytics {
  totalSpend: number;
  orderCount: number;
  averageOrderValue: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    totalSpend: number;
    orderCount: number;
  }>;
  spendByCategory: Array<{
    categoryId: string;
    categoryName: string;
    totalSpend: number;
    percentage: number;
  }>;
}

export interface WasteAnalytics {
  totalWaste: number;
  wasteValue: number;
  wastePercentage: number;
  topWasteItems: Array<{
    productId: string;
    productName: string;
    wastedQuantity: number;
    wasteValue: number;
    wasteReason: string;
  }>;
  wasteByCategory: Array<{
    categoryId: string;
    categoryName: string;
    wasteValue: number;
    percentage: number;
  }>;
}

// Query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  inventory: () => [...analyticsKeys.all, 'inventory'] as const,
  variance: () => [...analyticsKeys.all, 'variance'] as const,
  purchasing: () => [...analyticsKeys.all, 'purchasing'] as const,
  waste: () => [...analyticsKeys.all, 'waste'] as const,
  forecasting: () => [...analyticsKeys.all, 'forecasting'] as const,
};

// Analytics hooks
export const useInventoryAnalytics = (timeRange?: string) => {
  return useQuery({
    queryKey: [...analyticsKeys.inventory(), timeRange],
    queryFn: async () => {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<any>(`/api/analytics/inventory${params}`);
      
      // Map API response to expected structure
      if (response?.inventoryData) {
        return {
          totalProducts: response.inventoryData.totalItems,
          totalValue: response.inventoryData.totalValue,
          lowStockItems: response.inventoryData.lowStockCount,
          outOfStockItems: response.inventoryData.stockoutCount,
          turnoverRate: response.inventoryData.avgTurnover,
          wastePercentage: 0, // Not provided by API
          topMovingProducts: [],
          categoryBreakdown: [],
        } as InventoryAnalytics;
      }
      
      // Return default if no data
      return {
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        turnoverRate: 0,
        wastePercentage: 0,
        topMovingProducts: [],
        categoryBreakdown: [],
      } as InventoryAnalytics;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useVarianceAnalytics = (timeRange?: string) => {
  return useQuery({
    queryKey: [...analyticsKeys.variance(), timeRange],
    queryFn: async () => {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<{ success: boolean; data: VarianceAnalytics }>(`/api/analytics/variance${params}`);
      return response.data;
    },
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

export const usePurchasingAnalytics = (timeRange?: string) => {
  return useQuery({
    queryKey: [...analyticsKeys.purchasing(), timeRange],
    queryFn: async () => {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<{ success: boolean; data: PurchasingAnalytics }>(`/api/analytics/purchasing${params}`);
      return response.data;
    },
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
};

export const useWasteAnalytics = (timeRange?: string) => {
  return useQuery({
    queryKey: [...analyticsKeys.waste(), timeRange],
    queryFn: async () => {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get<{ success: boolean; data: WasteAnalytics }>(`/api/analytics/waste${params}`);
      return response.data;
    },
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
};

export const useForecasting = (productId?: string, days?: number) => {
  return useQuery({
    queryKey: [...analyticsKeys.forecasting(), productId, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId);
      if (days) params.append('days', days.toString());
      
      const queryString = params.toString();
      const url = `/api/analytics/forecasting${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<{ success: boolean; data: any }>(url);
      return response.data;
    },
    enabled: !!productId,
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  });
};