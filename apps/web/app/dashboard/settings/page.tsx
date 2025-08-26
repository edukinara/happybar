'use client'

import { AlertConfigSettings } from '@/components/alerts/AlertConfig'
import {
  AdminOnly,
  FinancialDataOnly,
  ManagerOnly,
  PermissionGate,
  SettingsOnly,
} from '@/components/auth/PermissionGate'
import { SettingsRoute } from '@/components/auth/RouteGuard'
import AuditLogsCard from '@/components/dashboard/Settings/AuditLogs'
import InventorySettingsCard from '@/components/dashboard/Settings/InventorySettings'
import LocationsCard from '@/components/dashboard/Settings/Locations'
import { UserManagementCard } from '@/components/dashboard/Settings/UserManagement'
import { SalesSyncCard } from '@/components/pos/sales-sync-card'
import { SyncDialog } from '@/components/pos/sync-dialog'
import { ToastIntegrationForm } from '@/components/pos/toast-integration-form'
import ToastIcon from '@/components/pos/toastIcon'
import { POSIntegrationsGate } from '@/components/subscription/feature-gate'
import { PricingModal } from '@/components/subscription/PricingModal'
import {
  useLocationUsageTracker,
  usePOSIntegrationUsageTracker,
  useTeamMemberUsageTracker,
} from '@/components/subscription/usage-tracker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { locationsApi, type LocationsResponse } from '@/lib/api/locations'
import { posApi } from '@/lib/api/pos'
import { organization } from '@/lib/auth/client'
import { useAutumnFeatures } from '@/lib/hooks/useAutumnFeatures'
import { cn } from '@/lib/utils'
import type { POSSyncStatus } from '@happy-bar/types'
import {
  AlertTriangle,
  ArrowUpCircle,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Settings,
  TestTube,
  Trash2,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface POSIntegration {
  id: string
  name: string
  type: string
  isActive: boolean
  lastSyncAt?: string
  syncStatus: POSSyncStatus
  syncErrors?: string[]
  selectedGroupGuids?: string[]
  createdAt: string
  updatedAt: string
}

export default function SettingsPage() {
  const [locations, setLocations] = useState<LocationsResponse>([])
  const [integrations, setIntegrations] = useState<POSIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewIntegrationDialog, setShowNewIntegrationDialog] =
    useState(false)
  const [testingConnections, setTestingConnections] = useState<Set<string>>(
    new Set()
  )

  // Remove unused syncing state since we now use SyncDialog
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [selectedIntegration, setSelectedIntegration] =
    useState<POSIntegration | null>(null)
  const [activeTab, setActiveTab] = useState('integrations')
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(['integrations'])
  )
  const [showPricingModal, setShowPricingModal] = useState(false)
  const {
    customer,
    loading: subscriptionLoading,
    openBillingPortal,
  } = useAutumnFeatures()

  // Track usage with new Autumn system
  const {
    trackIncrement: trackPOSIntegrationCreation,
    trackDecrement: trackPOSIntegrationDeletion,
  } = usePOSIntegrationUsageTracker()
  const { setUsage: setTeamMemberUsage } = useTeamMemberUsageTracker()
  const { setUsage: setLocationUsage } = useLocationUsageTracker()

  const trackUsersAndLocations = async () => {
    try {
      setLoading(true)
      await locationsApi.getLocations().then((res) => {
        setLocations(res)
        void setLocationUsage(res?.length || 0)
      })
      await organization.listMembers().then((res) => {
        if (res.data) void setTeamMemberUsage(res.data.total)
      })
    } catch (error) {
      console.error('Error setting Location and user usage:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      setLoading(true)
      await locationsApi.getLocations().then((res) => {
        setLocations(res)
        void setLocationUsage(res?.length || 0)
      })
    } catch (error) {
      console.error('Error setting Location usage:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only load integrations data on initial load since that's the default tab
    void fetchIntegrations()
  }, [])

  // Handle tab changes and lazy loading
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (!loadedTabs.has(value)) {
      setLoadedTabs((prev) => new Set(prev).add(value))

      // Load data for the specific tab
      if (value === 'organization') {
        void trackUsersAndLocations()
      }
    }
  }

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await posApi.getIntegrations()
      setIntegrations(data)
    } catch (err) {
      console.error('Failed to fetch integrations:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch integrations'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (integration: POSIntegration) => {
    setTestingConnections((prev) => new Set(prev).add(integration.id))
    try {
      await posApi.testConnection(integration.id).then((result) => {
        if (result.success) toast.success('Connection test successful')
        else toast.error('Connection test failed')
      })
      // Refresh integrations to get updated status
      await fetchIntegrations()
    } catch (err) {
      console.error('Connection test failed:', err)
    } finally {
      setTestingConnections((prev) => {
        const newSet = new Set(prev)
        newSet.delete(integration.id)
        return newSet
      })
    }
  }

  const handleSync = async (integration: POSIntegration) => {
    setSelectedIntegration(integration)
    setShowSyncDialog(true)
  }

  const handleSyncComplete = async () => {
    // Refresh integrations to get updated status
    setShowSyncDialog(false)
    setSelectedIntegration(null)
    await fetchIntegrations()
  }

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return

    try {
      await posApi.deleteIntegration(id)
      await fetchIntegrations() // Refresh the list
      // Track the deletion
      await trackPOSIntegrationDeletion()
    } catch (err) {
      console.error('Failed to delete integration:', err)
    }
  }

  const getSyncStatusBadge = (status: POSIntegration['syncStatus']) => {
    const statusMap = {
      NEVER_SYNCED: {
        label: 'Never Synced',
        color: 'bg-gray-100 text-gray-800',
      },
      SYNCING: { label: 'Syncing...', color: 'bg-blue-100 text-blue-800' },
      SUCCESS: { label: 'Success', color: 'bg-green-100 text-green-800' },
      FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      PARTIAL_SUCCESS: {
        label: 'Partial Success',
        color: 'bg-yellow-100 text-yellow-800',
      },
    }

    const config = statusMap[status] || statusMap.NEVER_SYNCED
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getSyncIcon = (status: POSIntegration['syncStatus']) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'FAILED':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'SYNCING':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
      case 'PARTIAL_SUCCESS':
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2 className='h-8 w-8 animate-spin' />
        <span className='ml-2'>Loading settings...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Failed to load settings
          </h2>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchIntegrations}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <SettingsRoute>
      <div className='min-h-screen brand-gradient relative'>
        {/* Floating orbs */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='brand-orb-accent w-96 h-96 absolute -top-20 -left-20 animate-float' />
          <div className='brand-orb-primary w-80 h-80 absolute top-96 -right-20 animate-float-reverse' />
          <div className='brand-orb-accent w-64 h-64 absolute bottom-40 left-2/3 animate-float' />
        </div>

        <div className='relative z-10 p-6 space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight brand-text-gradient'>
                Settings
              </h1>
              <p className='text-muted-foreground'>
                Manage your integrations, organization, and system settings.
              </p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className='space-y-6'
          >
            <TabsList className='grid w-full grid-cols-5'>
              <TabsTrigger
                value='integrations'
                className='flex items-center gap-2'
              >
                <Zap className='h-4 w-4 brand-icon-primary' />
                Integrations
              </TabsTrigger>
              <TabsTrigger
                value='organization'
                className='flex items-center gap-2'
              >
                <Building2 className='h-4 w-4 brand-icon-accent' />
                Organization
              </TabsTrigger>
              <TabsTrigger
                value='inventory'
                className='flex items-center gap-2'
              >
                <Package className='h-4 w-4 brand-icon-primary' />
                Inventory
              </TabsTrigger>
              <TabsTrigger value='billing' className='flex items-center gap-2'>
                <Crown className='h-4 w-4 brand-icon-accent' />
                Billing
              </TabsTrigger>
              <TabsTrigger value='system' className='flex items-center gap-2'>
                <FileText className='h-4 w-4 brand-icon-primary' />
                System
              </TabsTrigger>
            </TabsList>

            {/* Integrations Tab */}
            <TabsContent value='integrations' className='space-y-6'>
              {/* POS Integrations - Requires admin.settings permission */}
              <SettingsOnly
                fallback={
                  <Card className='brand-card'>
                    <CardContent className='text-center py-8'>
                      <Settings className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                      <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                        POS Integrations (Admin Only)
                      </h3>
                      <p className='text-muted-foreground'>
                        Administrator privileges required to manage POS
                        integrations.
                      </p>
                    </CardContent>
                  </Card>
                }
              >
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
                    <div>
                      <CardTitle className='flex items-center'>
                        <Settings className='mr-2 h-5 w-5 brand-icon-primary' />
                        POS Integrations
                      </CardTitle>
                      <CardDescription>
                        Connect your point-of-sale systems to sync products and
                        sales data.
                      </CardDescription>
                    </div>
                    <Dialog
                      open={showNewIntegrationDialog}
                      onOpenChange={setShowNewIntegrationDialog}
                    >
                      <DialogTrigger asChild>
                        <POSIntegrationsGate
                          fallback={
                            <Button disabled>
                              <Plus className='mr-2 h-4 w-4' />
                              Add Integration (Upgrade Required)
                            </Button>
                          }
                        >
                          <Button
                            onClick={() => setShowNewIntegrationDialog(true)}
                            className='btn-brand-primary'
                          >
                            <Plus className='mr-2 h-4 w-4' />
                            Add Integration
                          </Button>
                        </POSIntegrationsGate>
                      </DialogTrigger>
                      <DialogContent className='max-w-2xl'>
                        <DialogHeader>
                          <DialogTitle>Add POS Integration</DialogTitle>
                          <DialogDescription>
                            Connect your Toast POS system to sync menu items and
                            sales data.
                          </DialogDescription>
                        </DialogHeader>
                        <div className='max-h-[calc(100vh-10rem)] overflow-y-auto pr-4'>
                          <ToastIntegrationForm
                            onSuccess={async () => {
                              setShowNewIntegrationDialog(false)
                              await fetchIntegrations()
                              // Track the new integration creation
                              await trackPOSIntegrationCreation()
                            }}
                            onCancel={() => setShowNewIntegrationDialog(false)}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {integrations.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        <Settings className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                        <h3 className='text-lg font-medium mb-2'>
                          No integrations configured
                        </h3>
                        <p className='mb-4'>
                          Connect your POS system to get started with automated
                          inventory management.
                        </p>
                        <POSIntegrationsGate
                          fallback={
                            <Button disabled>
                              <Plus className='mr-2 h-4 w-4' />
                              Add Integration (Upgrade Required)
                            </Button>
                          }
                        >
                          <Button
                            onClick={() => setShowNewIntegrationDialog(true)}
                            className='btn-brand-primary'
                          >
                            <Plus className='mr-2 h-4 w-4' />
                            Add Your First Integration
                          </Button>
                        </POSIntegrationsGate>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Sync</TableHead>
                            <TableHead className='w-[200px]'>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {integrations.map((integration) => (
                            <TableRow key={integration.id}>
                              <TableCell>
                                <div className='flex items-center'>
                                  {getSyncIcon(integration.syncStatus)}
                                  <div className='ml-3'>
                                    <div className='font-medium'>
                                      {integration.name}
                                    </div>
                                    {integration.syncErrors &&
                                      integration.syncErrors.length > 0 && (
                                        <div className='text-sm text-red-600'>
                                          {integration.syncErrors[0]}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center'>
                                  <IntegrationLogo type={integration.type} />
                                  <Badge
                                    variant='outline'
                                    className='capitalize text-[11px]'
                                  >
                                    {integration.type.toLowerCase()}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getSyncStatusBadge(integration.syncStatus)}
                              </TableCell>
                              <TableCell className='text-muted-foreground'>
                                {integration.lastSyncAt
                                  ? new Date(
                                      integration.lastSyncAt
                                    ).toLocaleString()
                                  : 'Never'}
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center space-x-1'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                      handleTestConnection(integration)
                                    }
                                    disabled={testingConnections.has(
                                      integration.id
                                    )}
                                    title='Test Connection'
                                  >
                                    {testingConnections.has(integration.id) ? (
                                      <Loader2 className='h-3 w-3 animate-spin' />
                                    ) : (
                                      <TestTube className='h-3 w-3' />
                                    )}
                                  </Button>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => handleSync(integration)}
                                    disabled={
                                      integration.syncStatus === 'SYNCING'
                                    }
                                    title='Sync Data'
                                  >
                                    {integration.syncStatus === 'SYNCING' ? (
                                      <Loader2 className='h-3 w-3 animate-spin' />
                                    ) : (
                                      <RefreshCw className='h-3 w-3' />
                                    )}
                                  </Button>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                      handleDeleteIntegration(integration.id)
                                    }
                                    title='Delete Integration'
                                  >
                                    <Trash2 className='h-3 w-3 text-red-500' />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </SettingsOnly>

              {/* POS Sales Sync Management - Requires admin.settings permission */}
              <SettingsOnly
                fallback={
                  <Card className='brand-card'>
                    <CardContent className='text-center py-8'>
                      <RefreshCw className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                      <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                        Sales Sync Management (Admin Only)
                      </h3>
                      <p className='text-muted-foreground'>
                        Administrator privileges required to manage sales
                        synchronization.
                      </p>
                    </CardContent>
                  </Card>
                }
              >
                <SalesSyncCard />
              </SettingsOnly>
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value='organization' className='space-y-6'>
              {loadedTabs.has('organization') ? (
                <>
                  {/* Locations Management - Requires manager or admin role */}
                  <ManagerOnly
                    fallback={
                      <Card className='brand-card'>
                        <CardContent className='text-center py-8'>
                          <Settings className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                          <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                            Location Management (Manager+ Only)
                          </h3>
                          <p className='text-muted-foreground'>
                            Manager privileges or higher required to manage
                            locations.
                          </p>
                        </CardContent>
                      </Card>
                    }
                  >
                    <LocationsCard
                      locations={locations}
                      loading={loading}
                      fetchLocations={fetchLocations}
                    />
                  </ManagerOnly>

                  {/* User Management - Requires users.read permission */}
                  <PermissionGate
                    permission='users.read'
                    fallback={
                      <Card className='brand-card'>
                        <CardContent className='text-center py-8'>
                          <Users className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                          <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                            User Management (User Access Required)
                          </h3>
                          <p className='text-muted-foreground'>
                            User read permissions required to manage team
                            members and location assignments.
                          </p>
                        </CardContent>
                      </Card>
                    }
                  >
                    <UserManagementCard />
                  </PermissionGate>
                </>
              ) : (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin mr-2' />
                  <span>Loading organization data...</span>
                </div>
              )}
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value='inventory' className='space-y-6'>
              {/* Variance Alert Configuration - Requires inventory.write permission */}
              <PermissionGate
                permission='inventory.write'
                fallback={
                  <Card className='brand-card'>
                    <CardContent className='text-center py-8'>
                      <AlertTriangle className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                      <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                        Alert Configuration (Inventory Write Access Required)
                      </h3>
                      <p className='text-muted-foreground'>
                        Inventory write permissions required to configure
                        alerts.
                      </p>
                    </CardContent>
                  </Card>
                }
              >
                <AlertConfigSettings />
              </PermissionGate>

              {/* Inventory Settings - Requires inventory.write permission */}
              <PermissionGate
                permission='inventory.write'
                fallback={
                  <Card className='brand-card'>
                    <CardContent className='text-center py-8'>
                      <Package className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                      <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                        Inventory Settings (Inventory Write Access Required)
                      </h3>
                      <p className='text-muted-foreground'>
                        Inventory write permissions required to modify settings.
                      </p>
                    </CardContent>
                  </Card>
                }
              >
                <InventorySettingsCard />
              </PermissionGate>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value='billing' className='space-y-6'>
              {loadedTabs.has('billing') ? (
                <>
                  {/* Subscription Management - Financial data requires manager+ role */}
                  <FinancialDataOnly
                    fallback={
                      <Card className='brand-card'>
                        <CardContent className='text-center py-8'>
                          <Crown className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                          <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                            Subscription & Billing (Manager+ Only)
                          </h3>
                          <p className='text-muted-foreground'>
                            Financial information is restricted to management
                            level users.
                          </p>
                        </CardContent>
                      </Card>
                    }
                  >
                    <div>
                      <Card className='brand-card'>
                        <CardHeader>
                          <CardTitle className='flex items-center'>
                            <Crown className='mr-2 h-5 w-5 brand-icon-accent' />
                            Subscription & Billing
                          </CardTitle>
                          <CardDescription>
                            Manage your subscription plan and billing
                            information.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {subscriptionLoading ? (
                            <div className='flex items-center justify-center py-8'>
                              <Loader2 className='h-6 w-6 animate-spin' />
                              <span className='ml-2'>
                                Loading subscription data...
                              </span>
                            </div>
                          ) : customer ? (
                            <div className='space-y-4'>
                              <div className='flex items-center justify-between p-4 border rounded-lg'>
                                <div>
                                  <h4 className='font-medium'>Current Plan</h4>
                                  <div className='flex items-center gap-2 mt-1'>
                                    <span className='text-2xl font-bold'>
                                      {customer.products?.[0]?.name || 'Free'}
                                    </span>
                                    {customer.products?.[0]?.name !==
                                      'Free' && (
                                      <Badge variant='secondary'>Active</Badge>
                                    )}
                                  </div>
                                  {customer.products?.[0]?.name === 'Free' && (
                                    <p className='text-sm text-muted-foreground mt-2'>
                                      Upgrade to unlock advanced features
                                    </p>
                                  )}
                                </div>
                                <div className='flex gap-2'>
                                  {customer.products?.[0]?.name === 'Free' ? (
                                    <Button
                                      onClick={() => setShowPricingModal(true)}
                                      className='btn-brand-primary'
                                    >
                                      <ArrowUpCircle className='mr-2 h-4 w-4' />
                                      Upgrade Plan
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant='outline'
                                        onClick={() =>
                                          setShowPricingModal(true)
                                        }
                                      >
                                        <ArrowUpCircle className='mr-2 h-4 w-4' />
                                        Change Plan
                                      </Button>
                                      <Button
                                        onClick={openBillingPortal}
                                        className='btn-brand-primary'
                                      >
                                        <CreditCard className='mr-2 h-4 w-4' />
                                        Manage Billing
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Feature Usage */}
                              {customer.features && (
                                <div className='space-y-3'>
                                  <h4 className='text-sm font-medium'>
                                    Feature Usage
                                  </h4>
                                  <div className='grid grid-cols-2 gap-4'>
                                    {Object.entries(customer.features).map(
                                      ([key, feature]: [
                                        string,
                                        {
                                          usage: number
                                          unlimited?: boolean
                                          included_usage: number
                                        },
                                      ]) => (
                                        <div
                                          key={key}
                                          className='p-3 border rounded-lg'
                                        >
                                          <div className='flex justify-between items-center'>
                                            <span className='text-sm text-muted-foreground capitalize'>
                                              {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className='text-sm font-medium'>
                                              {feature.usage}/
                                              {feature.unlimited
                                                ? '∞'
                                                : feature.included_usage}
                                            </span>
                                          </div>
                                          {!feature.unlimited && (
                                            <div className='mt-2 w-full bg-gray-200 rounded-full h-2'>
                                              <div
                                                className={cn(
                                                  'bg-green-500 h-2 rounded-full',
                                                  feature.usage >=
                                                    feature.included_usage
                                                    ? 'bg-red-500'
                                                    : feature.usage /
                                                          feature.included_usage >
                                                        0.75
                                                      ? 'bg-amber-500'
                                                      : ''
                                                )}
                                                style={{
                                                  width: `${Math.min((feature.usage / feature.included_usage) * 100, 100)}%`,
                                                }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Billing Details */}
                              {customer.stripe_id && (
                                <div className='pt-4 border-t'>
                                  <div className='flex items-center justify-between'>
                                    <div>
                                      <p className='text-sm text-muted-foreground'>
                                        Customer ID
                                      </p>
                                      <p className='font-mono text-xs'>
                                        {customer.id}
                                      </p>
                                    </div>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      onClick={openBillingPortal}
                                    >
                                      View Invoices
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className='text-center py-8'>
                              <Crown className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                              <h3 className='text-lg font-medium mb-2'>
                                No Active Subscription
                              </h3>
                              <p className='text-muted-foreground mb-4'>
                                Start with our free plan or choose a paid plan
                                for advanced features.
                              </p>
                              <Button
                                onClick={() => setShowPricingModal(true)}
                                className='btn-brand-primary'
                              >
                                <ArrowUpCircle className='mr-2 h-4 w-4' />
                                View Plans
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </FinancialDataOnly>
                </>
              ) : (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin mr-2' />
                  <span>Loading billing data...</span>
                </div>
              )}
            </TabsContent>

            {/* System Tab */}
            <TabsContent value='system' className='space-y-6'>
              {loadedTabs.has('system') ? (
                <>
                  {/* Audit Logs - Requires admin.audit_logs permission */}
                  <AdminOnly
                    fallback={
                      <Card className='brand-card'>
                        <CardContent className='text-center py-8'>
                          <FileText className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                          <h3 className='text-lg font-medium mb-2 text-muted-foreground'>
                            Audit Logs (Admin Only)
                          </h3>
                          <p className='text-muted-foreground'>
                            Administrator privileges required to view audit
                            logs.
                          </p>
                        </CardContent>
                      </Card>
                    }
                  >
                    <AuditLogsCard />
                  </AdminOnly>
                </>
              ) : (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin mr-2' />
                  <span>Loading system data...</span>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Sync Dialog with Menu Group Selection */}
          <SyncDialog
            open={showSyncDialog}
            onOpenChange={setShowSyncDialog}
            integration={selectedIntegration}
            onSyncComplete={handleSyncComplete}
          />

          {/* Pricing Modal */}
          <PricingModal
            open={showPricingModal}
            onOpenChange={setShowPricingModal}
          />
        </div>
      </div>
    </SettingsRoute>
  )
}

const IntegrationLogo = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'toast':
      return <ToastIcon viewBox='0 0 48 48' size={32} />
    default:
      return null
  }
}
