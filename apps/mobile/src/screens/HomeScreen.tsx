import React from 'react';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { useAuthStore } from '../stores/authStore';
import { useInventoryAnalytics } from '../hooks/useAnalyticsData';
import { useLowStockItems } from '../hooks/useInventoryData';

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  // Fetch real data
  const { data: analytics, isLoading: analyticsLoading } =
    useInventoryAnalytics('7d');
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();

  const isLoading = analyticsLoading || lowStockLoading;

  const renderHeader = () => (
    <HStack className="justify-between items-center py-4 mb-6">
      <VStack className="flex-1" space="xs">
        <Text className="text-2xl font-bold text-typography-900">
          Welcome back, {user?.name || 'Bar Manager'}!
        </Text>
        <Text className="text-base text-typography-500">
          Here's your inventory overview
        </Text>
      </VStack>
      <Pressable className="w-12 h-12 rounded-full border border-outline-200 bg-white justify-center items-center shadow-sm">
        <Ionicons name="notifications-outline" size={24} color="#4B5563" />
      </Pressable>
    </HStack>
  );

  const renderStats = () => (
    <VStack className="mb-6" space="md">
      <Text className="text-lg font-semibold text-typography-900">Analytics</Text>
      <VStack space="md">
        <HStack space="md">
          <Card className="flex-1 p-4 bg-white rounded-xl shadow-sm">
            <HStack className="justify-between items-center mb-2">
              <Ionicons name="trending-up" size={20} color="#10B981" />
              <Text className="text-xs font-medium text-green-500">+12%</Text>
            </HStack>
            <VStack space="xs">
              <Text className="text-2xl font-bold text-typography-900">
                {analytics?.totalValue
                  ? `$${(analytics.totalValue / 1000).toFixed(1)}K`
                  : '$0'}
              </Text>
              <Text className="text-sm text-typography-500">Total Value</Text>
            </VStack>
          </Card>

          <Card className="flex-1 p-4 bg-white rounded-xl shadow-sm">
            <HStack className="justify-between items-center mb-2">
              <Ionicons name="cube-outline" size={20} color="#8B5CF6" />
              <Text className="text-xs font-medium text-purple-600">+3</Text>
            </HStack>
            <VStack space="xs">
              <Text className="text-2xl font-bold text-typography-900">
                {analytics?.totalProducts?.toString() || '0'}
              </Text>
              <Text className="text-sm text-typography-500">Products</Text>
            </VStack>
          </Card>
        </HStack>

        <HStack space="md">
          <Card className="flex-1 p-4 bg-white rounded-xl shadow-sm">
            <HStack className="justify-between items-center mb-2">
              <Ionicons name="speedometer" size={20} color="#F59E0B" />
              <Text className="text-xs font-medium text-amber-500">-5%</Text>
            </HStack>
            <VStack space="xs">
              <Text className="text-2xl font-bold text-typography-900">
                {analytics?.turnoverRate
                  ? `${analytics.turnoverRate.toFixed(1)}x`
                  : '0x'}
              </Text>
              <Text className="text-sm text-typography-500">Turnover</Text>
            </VStack>
          </Card>

          <Card className="flex-1 p-4 bg-white rounded-xl shadow-sm">
            <HStack className="justify-between items-center mb-2">
              <Ionicons name="analytics" size={20} color="#3B82F6" />
              <Text className="text-xs font-medium text-blue-500">-0.5%</Text>
            </HStack>
            <VStack space="xs">
              <Text className="text-2xl font-bold text-typography-900">
                {analytics?.wastePercentage
                  ? `${analytics.wastePercentage.toFixed(1)}%`
                  : '0%'}
              </Text>
              <Text className="text-sm text-typography-500">Waste</Text>
            </VStack>
          </Card>
        </HStack>
      </VStack>
    </VStack>
  );

  const renderQuickActions = () => (
    <VStack className="mb-6" space="md">
      <Text className="text-lg font-semibold text-typography-900">Quick Actions</Text>
      <VStack space="md">
        <HStack space="md">
          <Pressable className="flex-1 p-4 border border-outline-200 rounded-xl bg-white items-center shadow-sm">
            <VStack className="items-center" space="sm">
              <Ionicons name="scan" size={24} color="#8B5CF6" />
              <Text className="text-sm font-medium text-typography-700">Quick Count</Text>
            </VStack>
          </Pressable>
          <Pressable className="flex-1 p-4 border border-outline-200 rounded-xl bg-white items-center shadow-sm">
            <VStack className="items-center" space="sm">
              <Ionicons name="add-circle" size={24} color="#10B981" />
              <Text className="text-sm font-medium text-typography-700">Add Product</Text>
            </VStack>
          </Pressable>
        </HStack>
        <HStack space="md">
          <Pressable className="flex-1 p-4 border border-outline-200 rounded-xl bg-white items-center shadow-sm">
            <VStack className="items-center" space="sm">
              <Ionicons name="clipboard" size={24} color="#F59E0B" />
              <Text className="text-sm font-medium text-typography-700">Full Count</Text>
            </VStack>
          </Pressable>
          <Pressable className="flex-1 p-4 border border-outline-200 rounded-xl bg-white items-center shadow-sm">
            <VStack className="items-center" space="sm">
              <Ionicons name="cart" size={24} color="#3B82F6" />
              <Text className="text-sm font-medium text-typography-700">Create Order</Text>
            </VStack>
          </Pressable>
        </HStack>
      </VStack>
    </VStack>
  );

  const renderAlerts = () => {
    if (isLoading) return null;

    return (
      <VStack className="mb-6" space="md">
        <Text className="text-lg font-semibold text-typography-900">Alerts</Text>
        <VStack space="md">
          {analytics && analytics.outOfStockItems > 0 && (
            <Card className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
              <HStack className="items-center" space="md">
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <VStack className="flex-1" space="xs">
                  <Text className="font-semibold text-typography-900">
                    {analytics.outOfStockItems} Items Out of Stock
                  </Text>
                  <Text className="text-sm text-typography-500">
                    Items need immediate reordering
                  </Text>
                </VStack>
              </HStack>
            </Card>
          )}

          {analytics && analytics.lowStockItems > 0 && (
            <Card className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
              <HStack className="items-center" space="md">
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <VStack className="flex-1" space="xs">
                  <Text className="font-semibold text-typography-900">
                    Low Stock Alert
                  </Text>
                  <Text className="text-sm text-typography-500">
                    {analytics.lowStockItems} items below par level
                  </Text>
                </VStack>
              </HStack>
            </Card>
          )}

          {(!analytics ||
            (analytics.outOfStockItems === 0 &&
              analytics.lowStockItems === 0)) && (
            <Card className="p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
              <HStack className="items-center" space="md">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <VStack className="flex-1" space="xs">
                  <Text className="font-semibold text-typography-900">
                    All Stock Levels Good
                  </Text>
                  <Text className="text-sm text-typography-500">
                    No critical inventory issues
                  </Text>
                </VStack>
              </HStack>
            </Card>
          )}
        </VStack>
      </VStack>
    );
  };

  return (
    <Box className="flex-1 bg-background-50">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderAlerts()}
        {renderStats()}
        {renderQuickActions()}
      </ScrollView>
    </Box>
  );
}

