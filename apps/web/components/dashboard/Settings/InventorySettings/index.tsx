'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  inventorySettingsApi,
  type InventorySettings,
} from '@/lib/api/inventory-settings'
import {
  AlertTriangle,
  HelpCircle,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Shield,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function InventorySettingsCard() {
  const [settings, setSettings] = useState<InventorySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await inventorySettingsApi.getSettings()
      setSettings(data)
    } catch (error) {
      console.warn('Failed to load inventory settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const updatedSettings =
        await inventorySettingsApi.updateSettings(settings)
      setSettings(updatedSettings)
      toast.success('Inventory settings saved successfully')
    } catch (error) {
      console.warn('Failed to save inventory settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?'))
      return

    setSaving(true)
    try {
      const defaultSettings = await inventorySettingsApi.resetSettings()
      setSettings(defaultSettings)
      toast.success('Settings reset to defaults')
    } catch (error) {
      console.warn('Failed to reset settings:', error)
      toast.error('Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  const updatePolicy = (
    policyType: 'webhookPolicy' | 'cronSyncPolicy' | 'manualPolicy',
    field: string,
    value: any
  ) => {
    if (!settings) return
    setSettings((prev) => ({
      ...prev!,
      [policyType]: {
        ...prev![policyType],
        [field]: value,
      },
    }))
  }

  const updateWarningThreshold = (
    policyType: 'webhookPolicy' | 'cronSyncPolicy' | 'manualPolicy',
    threshold: 'low' | 'critical',
    value: number
  ) => {
    if (!settings) return
    setSettings((prev) => ({
      ...prev!,
      [policyType]: {
        ...prev![policyType],
        warningThresholds: {
          ...prev![policyType].warningThresholds,
          [threshold]: value,
        },
      },
    }))
  }

  const PolicySection = ({
    title,
    description,
    icon,
    policyType,
    policy,
  }: {
    title: string
    description: string
    icon: React.ReactNode
    policyType: 'webhookPolicy' | 'cronSyncPolicy' | 'manualPolicy'
    policy: InventorySettings['webhookPolicy']
  }) => (
    <div className='space-y-4 p-4 border rounded-lg'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          {icon}
          <div>
            <h4 className='font-medium'>{title}</h4>
            <p className='text-sm text-muted-foreground'>{description}</p>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <Switch
            checked={policy.allowOverDepletion}
            onCheckedChange={(checked) =>
              updatePolicy(policyType, 'allowOverDepletion', checked)
            }
          />
          <Label className='text-sm'>
            {policy.allowOverDepletion ? 'Allowed' : 'Blocked'}
          </Label>
        </div>
      </div>

      {policy.allowOverDepletion && (
        <div className='ml-6 pt-2 border-t'>
          <div className='flex items-center space-x-2 text-sm text-muted-foreground mb-2'>
            <AlertTriangle className='size-3' />
            <span>Over-depletion will be logged for audit purposes</span>
          </div>
        </div>
      )}

      <div className='grid grid-cols-2 gap-4'>
        <div>
          <Label className='text-sm'>Low Stock Warning (%)</Label>
          <Input
            type='number'
            min='1'
            max='100'
            value={policy.warningThresholds.low}
            onChange={(e) =>
              updateWarningThreshold(policyType, 'low', Number(e.target.value))
            }
            className='mt-1'
          />
        </div>
        <div>
          <Label className='text-sm'>Critical Stock Warning (%)</Label>
          <Input
            type='number'
            min='1'
            max='100'
            value={policy.warningThresholds.critical}
            onChange={(e) =>
              updateWarningThreshold(
                policyType,
                'critical',
                Number(e.target.value)
              )
            }
            className='mt-1'
          />
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center'>
          <Package className='mr-2 size-5' />
          Inventory Settings
        </CardTitle>
        <CardDescription>
          Configure inventory depletion policies, unit conversion, and audit
          logging.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='size-6 animate-spin' />
            <span className='ml-2'>Loading inventory settings...</span>
          </div>
        ) : !settings ? (
          <div className='text-center py-8 text-muted-foreground'>
            <AlertTriangle className='h-12 w-12 mx-auto mb-4 text-red-300' />
            <p>Failed to load inventory settings</p>
            <Button variant='outline' onClick={loadSettings} className='mt-4'>
              <RefreshCw className='mr-2 size-4' />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Over-Depletion Policies */}
            <div>
              <div className='flex items-center space-x-2 mb-4'>
                <h3 className='text-lg font-medium'>Over-Depletion Policies</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='size-4 text-muted-foreground' />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className='max-w-xs'>
                        Control whether inventory can go negative
                        (over-depletion) for different sources. Real-time
                        operations typically allow over-depletion to avoid
                        blocking sales, while batch operations can be more
                        strict.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className='space-y-4'>
                <PolicySection
                  title='Real-time POS Sales (Webhooks)'
                  description='Live sales from POS systems via webhooks'
                  icon={<Zap className='size-4 text-green-500' />}
                  policyType='webhookPolicy'
                  policy={settings.webhookPolicy}
                />

                <PolicySection
                  title='Scheduled POS Sync (Cron)'
                  description='Batch import of sales data via scheduled sync'
                  icon={<Shield className='size-4 text-blue-500' />}
                  policyType='cronSyncPolicy'
                  policy={settings.cronSyncPolicy}
                />

                <PolicySection
                  title='Manual Operations'
                  description='Manual inventory adjustments and counts'
                  icon={<Package className='size-4 text-purple-500' />}
                  policyType='manualPolicy'
                  policy={settings.manualPolicy}
                />
              </div>
            </div>

            <Separator />

            {/* Unit Conversion Settings */}
            <div>
              <h3 className='text-lg font-medium mb-4'>Unit Conversion</h3>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Enable Automatic Unit Conversion</Label>
                    <p className='text-sm text-muted-foreground'>
                      Automatically convert between POS serving units and
                      inventory units (e.g., 1.5oz shot from 750ml bottle)
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableAutoConversion}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev!,
                        enableAutoConversion: checked,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Conversion Failure Behavior</Label>
                  <Select
                    value={settings.conversionFallback}
                    onValueChange={(value: 'error' | 'warn' | 'ignore') =>
                      setSettings((prev) => ({
                        ...prev!,
                        conversionFallback: value,
                      }))
                    }
                  >
                    <SelectTrigger className='mt-1'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='error'>
                        <div className='flex items-center space-x-2'>
                          <Badge
                            variant='destructive'
                            className='px-1 py-0 text-xs'
                          >
                            Error
                          </Badge>
                          <span>Block operation and show error</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='warn'>
                        <div className='flex items-center space-x-2'>
                          <Badge
                            variant='secondary'
                            className='px-1 py-0 text-xs'
                          >
                            Warn
                          </Badge>
                          <span>Continue with warning message</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='ignore'>
                        <div className='flex items-center space-x-2'>
                          <Badge
                            variant='outline'
                            className='px-1 py-0 text-xs'
                          >
                            Ignore
                          </Badge>
                          <span>Use original amount silently</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Audit Logging */}
            <div>
              <h3 className='text-lg font-medium mb-4'>Audit Logging</h3>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Log Over-Depletion Events</Label>
                    <p className='text-sm text-muted-foreground'>
                      Record when inventory goes negative for audit purposes
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableOverDepletionLogging}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev!,
                        enableOverDepletionLogging: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Log Unit Conversions</Label>
                    <p className='text-sm text-muted-foreground'>
                      Record unit conversion details for debugging
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableUnitConversionLogging}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev!,
                        enableUnitConversionLogging: checked,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Log Retention (Days)</Label>
                  <Input
                    type='number'
                    min='1'
                    max='365'
                    value={settings.auditLogRetentionDays}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        auditLogRetentionDays: Number(e.target.value),
                      }))
                    }
                    className='mt-1 max-w-32'
                  />
                </div>
              </div>
            </div>

            <div className='flex justify-between pt-4'>
              <Button
                variant='outline'
                onClick={handleReset}
                disabled={saving || loading}
              >
                <RefreshCw className='mr-2 size-4' />
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || loading || !settings}
              >
                <Save className='mr-2 size-4' />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
