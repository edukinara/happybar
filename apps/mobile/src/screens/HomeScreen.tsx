import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.name || 'Bar Manager'}!
        </Text>
        <Text style={styles.overviewText}>
          Here's your inventory overview
        </Text>
      </View>
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={24} color="#4B5563" />
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Analytics</Text>
      <View>
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
              <Text style={[styles.statChange, { color: '#10B981' }]}>+12%</Text>
            </View>
            <View>
              <Text style={styles.statValue}>
                {analytics?.totalValue
                  ? `$${(analytics.totalValue / 1000).toFixed(1)}K`
                  : '$0'}
              </Text>
              <Text style={styles.statLabel}>Total Value</Text>
            </View>
          </View>

          <View style={[styles.card, styles.statCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="cube-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.statChange, { color: '#8B5CF6' }]}>+3</Text>
            </View>
            <View>
              <Text style={styles.statValue}>
                {analytics?.totalProducts?.toString() || '0'}
              </Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="speedometer" size={20} color="#F59E0B" />
              <Text style={[styles.statChange, { color: '#F59E0B' }]}>-5%</Text>
            </View>
            <View>
              <Text style={styles.statValue}>
                {analytics?.turnoverRate
                  ? `${analytics.turnoverRate.toFixed(1)}x`
                  : '0x'}
              </Text>
              <Text style={styles.statLabel}>Turnover</Text>
            </View>
          </View>

          <View style={[styles.card, styles.statCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="analytics" size={20} color="#3B82F6" />
              <Text style={[styles.statChange, { color: '#3B82F6' }]}>-0.5%</Text>
            </View>
            <View>
              <Text style={styles.statValue}>
                {analytics?.wastePercentage
                  ? `${analytics.wastePercentage.toFixed(1)}%`
                  : '0%'}
              </Text>
              <Text style={styles.statLabel}>Waste</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionContent}>
              <Ionicons name="scan" size={24} color="#8B5CF6" />
              <Text style={styles.quickActionText}>Quick Count</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionContent}>
              <Ionicons name="add-circle" size={24} color="#10B981" />
              <Text style={styles.quickActionText}>Add Product</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionContent}>
              <Ionicons name="clipboard" size={24} color="#F59E0B" />
              <Text style={styles.quickActionText}>Full Count</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionContent}>
              <Ionicons name="cart" size={24} color="#3B82F6" />
              <Text style={styles.quickActionText}>Create Order</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAlerts = () => {
    if (isLoading) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        <View>
          {analytics && analytics.outOfStockItems > 0 && (
            <View style={[styles.alertCard, styles.alertCardError]}>
              <View style={styles.alertContent}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" style={styles.alertIcon} />
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertTitle}>
                    {analytics.outOfStockItems} Items Out of Stock
                  </Text>
                  <Text style={styles.alertDescription}>
                    Items need immediate reordering
                  </Text>
                </View>
              </View>
            </View>
          )}

          {analytics && analytics.lowStockItems > 0 && (
            <View style={[styles.alertCard, styles.alertCardWarning]}>
              <View style={styles.alertContent}>
                <Ionicons name="warning" size={24} color="#F59E0B" style={styles.alertIcon} />
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertTitle}>
                    Low Stock Alert
                  </Text>
                  <Text style={styles.alertDescription}>
                    {analytics.lowStockItems} items below par level
                  </Text>
                </View>
              </View>
            </View>
          )}

          {(!analytics ||
            (analytics.outOfStockItems === 0 &&
              analytics.lowStockItems === 0)) && (
            <View style={[styles.alertCard, styles.alertCardSuccess]}>
              <View style={styles.alertContent}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.alertIcon} />
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertTitle}>
                    All Stock Levels Good
                  </Text>
                  <Text style={styles.alertDescription}>
                    No critical inventory issues
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderHeader()}
        {renderAlerts()}
        {renderStats()}
        {renderQuickActions()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  overviewText: {
    fontSize: 16,
    color: '#6B7280',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  quickActionContent: {
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  alertCardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  alertCardWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  alertCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
});