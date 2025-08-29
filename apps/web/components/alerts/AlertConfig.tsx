'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { alertsApi, type AlertConfig } from '@/lib/api/alerts'
import { AlertTriangle, RefreshCw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function AlertConfigSettings() {
  const [config, setConfig] = useState<AlertConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await alertsApi.getConfig()
      setConfig(data)
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to load alert configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return

    try {
      setSaving(true)
      await alertsApi.updateConfig(config)
      toast.success('Success', {
        description: 'Alert configuration saved successfully',
      })
      toast.error('Error', {
        description: 'Failed to save alert configuration',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEvaluateAlerts = async () => {
    try {
      setEvaluating(true)
      const result = await alertsApi.evaluateAlerts()
      toast.error('Evaluation Complete!', {
        description: result.message,
      })
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to evaluate alerts',
      })
    } finally {
      setEvaluating(false)
    }
  }

  const updateConfig = (field: keyof AlertConfig, value: unknown) => {
    if (!config) return
    setConfig({ ...config, [field]: value })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertTriangle className='size-5' />
            Variance Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='animate-pulse space-y-4 w-full'>
              <div className='h-4 bg-gray-200 rounded w-1/4'></div>
              <div className='h-8 bg-gray-200 rounded w-full'></div>
              <div className='h-4 bg-gray-200 rounded w-1/3'></div>
              <div className='h-8 bg-gray-200 rounded w-full'></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertTriangle className='size-5' />
            Variance Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-red-600'>
            Failed to load configuration
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <AlertTriangle className='size-5' />
              Variance Alert Configuration
            </CardTitle>
            <p className='text-sm text-muted-foreground mt-1'>
              Configure automated variance detection and alerting thresholds
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={handleEvaluateAlerts}
              disabled={evaluating}
            >
              {evaluating ? (
                <RefreshCw className='size-4 mr-2 animate-spin' />
              ) : (
                <RefreshCw className='size-4 mr-2' />
              )}
              Run Evaluation
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCw className='size-4 mr-2 animate-spin' />
              ) : (
                <Save className='size-4 mr-2' />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Alert Type Toggles */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Alert Types</h3>

          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='usage-variance'>Usage Variance Alerts</Label>
              <p className='text-sm text-muted-foreground'>
                Alert when actual usage differs significantly from theoretical
                usage
              </p>
            </div>
            <Switch
              id='usage-variance'
              checked={config.enableUsageVarianceAlerts}
              onCheckedChange={(checked) =>
                updateConfig('enableUsageVarianceAlerts', checked)
              }
            />
          </div>

          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='efficiency-alerts'>Low Efficiency Alerts</Label>
              <p className='text-sm text-muted-foreground'>
                Alert when product efficiency falls below acceptable levels
              </p>
            </div>
            <Switch
              id='efficiency-alerts'
              checked={config.enableEfficiencyAlerts}
              onCheckedChange={(checked) =>
                updateConfig('enableEfficiencyAlerts', checked)
              }
            />
          </div>

          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='overuse-alerts'>Overuse Detection Alerts</Label>
              <p className='text-sm text-muted-foreground'>
                Alert when product usage exceeds what sales data indicates
              </p>
            </div>
            <Switch
              id='overuse-alerts'
              checked={config.enableOveruseAlerts}
              onCheckedChange={(checked) =>
                updateConfig('enableOveruseAlerts', checked)
              }
            />
          </div>
        </div>

        <Separator />

        {/* Threshold Settings */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Detection Thresholds</h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='variance-threshold'>
                Usage Variance Threshold (%)
              </Label>
              <Input
                id='variance-threshold'
                type='number'
                min='0'
                max='100'
                step='0.1'
                value={config.usageVarianceThreshold}
                onChange={(e) =>
                  updateConfig(
                    'usageVarianceThreshold',
                    parseFloat(e.target.value) || 0
                  )
                }
                disabled={!config.enableUsageVarianceAlerts}
              />
              <p className='text-xs text-muted-foreground'>
                Alert when variance exceeds this percentage (default: 15%)
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='efficiency-threshold'>
                Low Efficiency Threshold (%)
              </Label>
              <Input
                id='efficiency-threshold'
                type='number'
                min='0'
                max='100'
                step='0.1'
                value={config.lowEfficiencyThreshold}
                onChange={(e) =>
                  updateConfig(
                    'lowEfficiencyThreshold',
                    parseFloat(e.target.value) || 0
                  )
                }
                disabled={!config.enableEfficiencyAlerts}
              />
              <p className='text-xs text-muted-foreground'>
                Alert when efficiency falls below this percentage (default: 70%)
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='overuse-threshold'>
                Overuse Detection Threshold (%)
              </Label>
              <Input
                id='overuse-threshold'
                type='number'
                min='0'
                max='100'
                step='0.1'
                value={config.overuseThreshold}
                onChange={(e) =>
                  updateConfig(
                    'overuseThreshold',
                    parseFloat(e.target.value) || 0
                  )
                }
                disabled={!config.enableOveruseAlerts}
              />
              <p className='text-xs text-muted-foreground'>
                Alert when usage exceeds sales by this percentage (default: 20%)
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='cost-impact-threshold'>
                Cost Impact Threshold ($)
              </Label>
              <Input
                id='cost-impact-threshold'
                type='number'
                min='0'
                step='0.01'
                value={config.costImpactThreshold}
                onChange={(e) =>
                  updateConfig(
                    'costImpactThreshold',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
              <p className='text-xs text-muted-foreground'>
                Upgrade to CRITICAL severity when cost impact exceeds this
                amount (default: $50)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Alert Management Settings */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Alert Management</h3>

          <div className='space-y-2'>
            <Label htmlFor='cooldown-hours'>
              Alert Cooldown Period (hours)
            </Label>
            <Input
              id='cooldown-hours'
              type='number'
              min='1'
              max='168'
              value={config.cooldownHours}
              onChange={(e) =>
                updateConfig('cooldownHours', parseInt(e.target.value) || 1)
              }
            />
            <p className='text-xs text-muted-foreground'>
              Minimum time between duplicate alerts for the same issue (1-168
              hours, default: 24)
            </p>
          </div>
        </div>

        {/* Information Box */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='size-5 text-blue-600 mt-0.5' />
            <div className='space-y-1'>
              <h4 className='text-sm font-medium text-blue-900'>
                How Variance Alerts Work
              </h4>
              <div className='text-sm text-blue-800 space-y-1'>
                <p>
                  • <strong>Usage Variance:</strong> Compares theoretical usage
                  (based on recipes) with actual inventory changes
                </p>
                <p>
                  • <strong>Low Efficiency:</strong> Detects when you&apos;re
                  using more product than expected for your sales volume
                </p>
                <p>
                  • <strong>Overuse Detection:</strong> Identifies potential
                  theft or unrecorded usage when consumption exceeds sales
                </p>
                <p>
                  • Alerts are automatically evaluated daily and can be
                  triggered manually
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
