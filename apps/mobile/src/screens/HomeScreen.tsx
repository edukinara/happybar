import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useInventoryAnalytics } from '../hooks/useAnalyticsData';
import { useLowStockItems } from '../hooks/useInventoryData';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  
  // Fetch real data
  const { data: analytics, isLoading: analyticsLoading } = useInventoryAnalytics('7d');
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  
  const isLoading = analyticsLoading || lowStockLoading;

  // Test connectivity on component mount
  React.useEffect(() => {
    const testConnection = async () => {
      const { apiClient } = await import('../lib/api');
      await apiClient.testConnectivity();
    };
    testConnection();
  }, []);

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Bar Manager'}!</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <View style={styles.notificationBadge} />
              <Ionicons name="notifications-outline" size={24} color={Colors.gray[700]} />
            </TouchableOpacity>
          </View>

          <View style={styles.alertsContainer}>
            {analytics && analytics.outOfStockItems > 0 && (
              <AlertCard
                type="critical"
                title={`${analytics.outOfStockItems} Items Out of Stock`}
                message="Items need immediate reordering"
                icon="alert-circle"
              />
            )}
            {analytics && analytics.lowStockItems > 0 && (
              <AlertCard
                type="warning"
                title="Low Stock Alert"
                message={`${analytics.lowStockItems} items below par level`}
                icon="warning"
              />
            )}
            {(!analytics || (analytics.outOfStockItems === 0 && analytics.lowStockItems === 0)) && !isLoading && (
              <AlertCard
                type="success"
                title="All Stock Levels Good"
                message="No critical inventory issues"
                icon="checkmark-circle"
              />
            )}
          </View>

          <View style={styles.statsGrid}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading analytics...</Text>
              </View>
            ) : (
              <>
                <StatCard
                  title="Total Value"
                  value={analytics?.totalValue ? `$${(analytics.totalValue / 1000).toFixed(1)}K` : '$0'}
                  change="+12%"
                  icon="trending-up"
                  color={Colors.success}
                />
                <StatCard
                  title="Products"
                  value={analytics?.totalProducts?.toString() || '0'}
                  change="+3"
                  icon="cube-outline"
                  color={Colors.primary}
                />
                <StatCard
                  title="Turnover"
                  value={analytics?.turnoverRate ? `${analytics.turnoverRate.toFixed(1)}x` : '0x'}
                  change="-5%"
                  icon="speedometer"
                  color={Colors.secondary}
                />
                <StatCard
                  title="Waste"
                  value={analytics?.wastePercentage ? `${analytics.wastePercentage.toFixed(1)}%` : '0%'}
                  change="-0.5%"
                  icon="analytics"
                  color={analytics?.wastePercentage && analytics.wastePercentage > 3 ? Colors.error : Colors.info}
                />
              </>
            )}
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <ActionButton
                icon="scan"
                label="Quick Count"
                color={Colors.primary}
                onPress={() => {}}
              />
              <ActionButton
                icon="add-circle"
                label="Add Product"
                color={Colors.success}
                onPress={() => {}}
              />
              <ActionButton
                icon="clipboard"
                label="Full Count"
                color={Colors.secondary}
                onPress={() => {}}
              />
              <ActionButton
                icon="cart"
                label="Create Order"
                color={Colors.info}
                onPress={() => {}}
              />
            </View>
          </View>

          <View style={styles.recentActivity}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <ActivityItem
              icon="checkmark-circle"
              title="Inventory Count Completed"
              time="2 hours ago"
              user="John Doe"
            />
            <ActivityItem
              icon="cart"
              title="Order #1234 Received"
              time="5 hours ago"
              user="System"
            />
            <ActivityItem
              icon="swap-horizontal"
              title="Stock Transfer to Bar 2"
              time="Yesterday"
              user="Jane Smith"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function AlertCard({ type, title, message, icon }: any) {
  const getColor = () => {
    switch (type) {
      case 'critical': return Colors.error;
      case 'warning': return Colors.warning;
      case 'success': return Colors.success;
      default: return Colors.info;
    }
  };

  return (
    <TouchableOpacity style={[styles.alertCard, { borderLeftColor: getColor() }]}>
      <Ionicons name={icon} size={24} color={getColor()} />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertMessage}>{message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
    </TouchableOpacity>
  );
}

function StatCard({ title, value, change, icon, color }: any) {
  const isPositive = change.startsWith('+');
  
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.statChange, { color: isPositive ? Colors.success : Colors.error }]}>
          {change}
        </Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function ActionButton({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActivityItem({ icon, title, time, user }: any) {
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Ionicons name={icon} size={20} color={Colors.gray[600]} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityMeta}>{user} • {time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greeting: {
    fontSize: Typography.sizes.md,
    color: Colors.gray[600],
  },
  userName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.gray[900],
  },
  notificationButton: {
    position: 'relative',
    padding: Spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  alertsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  alertContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  alertTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray[900],
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray[600],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg - 4,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm * 2) / 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: 4,
    ...Shadows.sm,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.gray[900],
    marginBottom: 2,
  },
  statTitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray[600],
  },
  statChange: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  quickActions: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray[900],
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: (width - Spacing.lg * 2 - Spacing.md * 3) / 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.gray[700],
    textAlign: 'center',
  },
  recentActivity: {
    paddingHorizontal: Spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.gray[900],
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray[500],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.gray[600],
    marginTop: Spacing.sm,
  },
});