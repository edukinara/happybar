import { QueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import { inventoryKeys } from '../hooks/useInventoryData';
import { analyticsKeys } from '../hooks/useAnalyticsData';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global retry configuration
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Cache time configuration
      staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
      
      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      
      // Error handling
      throwOnError: false,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Real-time data syncing functions
export const syncInventoryData = () => {
  // Invalidate and refetch all inventory-related data
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
};

export const syncSpecificProduct = (productId: string) => {
  // Invalidate specific product data
  queryClient.invalidateQueries({ queryKey: inventoryKeys.product(productId) });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.levels() });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
};

export const setupPeriodicSync = () => {
  // Set up periodic background sync every 5 minutes
  const syncInterval = setInterval(() => {
    // Only sync if the app is active and has network connection
    if (typeof window !== 'undefined' && navigator.onLine !== false) {
      console.log('🔄 Performing periodic data sync...');
      syncInventoryData();
    }
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(syncInterval);
};

// Optimistic updates for better UX
export const updateInventoryLevelOptimistically = (
  productId: string, 
  locationId: string, 
  newQuantity: number
) => {
  const levelsQueryKey = inventoryKeys.levels();
  
  queryClient.setQueryData(levelsQueryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    return oldData.map((level: any) => {
      if (level.productId === productId && level.locationId === locationId) {
        return { ...level, currentQuantity: newQuantity };
      }
      return level;
    });
  });
};