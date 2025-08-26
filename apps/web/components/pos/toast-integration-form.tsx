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
import { posApi } from '@/lib/api/pos'
import { POSType } from '@happy-bar/types'
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Info,
  Loader2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ToastCredentials {
  name: string
  type: POSType.TOAST
  integrationMode: 'standard' | 'partner'
  // Standard API Access
  clientId?: string
  clientSecret?: string
  // Location ID - 6-digit code used in both Standard API Access and Partner Integration
  partnerLocationId?: string
}

interface ToastIntegrationFormProps {
  onSuccess: () => void
  onCancel: () => void
  initialData?: Partial<ToastCredentials>
}

export function ToastIntegrationForm({
  onSuccess,
  onCancel,
  initialData,
}: ToastIntegrationFormProps) {
  const [formData, setFormData] = useState<ToastCredentials>({
    name: initialData?.name || '',
    type: POSType.TOAST,
    integrationMode: initialData?.integrationMode || 'partner',
    clientId: initialData?.clientId || '',
    clientSecret: initialData?.clientSecret || '',
    partnerLocationId: initialData?.partnerLocationId || '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean
    error?: string
    restaurantCount?: number
  } | null>(null)

  const handleInputChange = useCallback(
    (field: keyof ToastCredentials, value: string | string[]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setError(null)
      setConnectionTestResult(null)
    },
    []
  )

  const generateLocationCode = useCallback(async () => {
    if (!isStandardMode) {
      setGeneratingCode(true)
      setError(null)

      try {
        const response = await posApi.generateLocationCode()
        handleInputChange('partnerLocationId', response.locationCode)
      } catch (err: unknown) {
        console.warn('Failed to generate location code:', err)
        setError('Failed to generate location code')
      } finally {
        setGeneratingCode(false)
      }
    }
  }, [handleInputChange])

  // Auto-generate location code when form loads or integration mode changes
  useEffect(() => {
    if (
      !isStandardMode &&
      !formData.partnerLocationId &&
      !initialData?.partnerLocationId
    ) {
      generateLocationCode()
    }
  }, [
    formData.integrationMode,
    formData.partnerLocationId,
    initialData?.partnerLocationId,
    generateLocationCode,
  ])

  const validateForm = (): boolean => {
    if (!formData.name) {
      setError('Integration name is required')
      return false
    }

    // Validate location code for both integration modes
    if (!formData.partnerLocationId) {
      setError('Location code is required')
      return false
    }
    // Validate 6-digit format
    const codeRegex = /^\d{6}$/
    if (!isStandardMode && !codeRegex.test(formData.partnerLocationId)) {
      setError('Location code must be exactly 6 digits')
      return false
    }

    if (formData.integrationMode === 'standard') {
      if (!formData.clientId || !formData.clientSecret) {
        setError(
          'Client ID and Client Secret are required for Standard API Access'
        )
        return false
      }
    }

    return true
  }

  const handleTestConnection = async () => {
    if (!validateForm()) return

    setTestingConnection(true)
    setConnectionTestResult(null)
    setError(null)

    try {
      // Create temporary integration to test
      const testData = {
        ...formData,
        name: formData.name,
      }

      const integration = await posApi.createIntegration(testData)

      // Test the connection
      const result = await posApi.testConnection(integration.id)

      // Clean up test integration
      await posApi.deleteIntegration(integration.id)

      setConnectionTestResult({
        success: result.success,
        error: result.error,
        restaurantCount: result.data?.restaurantCount,
      })
    } catch (err: unknown) {
      console.warn('Connection test failed:', err)
      setConnectionTestResult({
        success: false,
        error:
          (
            err as {
              response?: { data?: { message?: string } }
              message?: string
            }
          )?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Connection test failed',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      await posApi.createIntegration(formData)
      onSuccess()
    } catch (err: unknown) {
      console.warn('Failed to create integration:', err)
      setError(
        (
          err as {
            response?: { data?: { message?: string } }
            message?: string
          }
        )?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Failed to create integration'
      )
    } finally {
      setLoading(false)
    }
  }

  const isStandardMode = formData.integrationMode === 'standard'

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {/* Integration Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Type</CardTitle>
          <CardDescription>
            Choose how you want to connect to Toast
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                !isStandardMode
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleInputChange('integrationMode', 'partner')}
            >
              <div className='flex items-center justify-between mb-2'>
                <Badge variant={!isStandardMode ? 'default' : 'secondary'}>
                  Partner Integration
                </Badge>
                {!isStandardMode && (
                  <CheckCircle className='h-4 w-4 text-primary' />
                )}
              </div>
              <p className='text-sm text-muted-foreground'>
                <span className='font-medium block mb-1'>Recommended</span>
                Seamless integration through Happy Bar&apos;s partnership with
                Toast. Just connect through Toast Partner Integrations.
              </p>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isStandardMode
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => {
                handleInputChange('integrationMode', 'standard')
                handleInputChange('partnerLocationId', '')
              }}
            >
              <div className='flex items-center justify-between mb-2'>
                <Badge variant={isStandardMode ? 'default' : 'secondary'}>
                  Standard API Access
                </Badge>
                {isStandardMode && (
                  <CheckCircle className='h-4 w-4 text-primary' />
                )}
              </div>
              <p className='text-sm text-muted-foreground'>
                Direct access using your Toast API credentials. Requires manual
                setup in Toast Management Console.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Integration Name</Label>
            <Input
              id='name'
              type='text'
              placeholder='e.g., Main Restaurant Toast Integration'
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
            <p className='text-sm text-muted-foreground mt-1'>
              A friendly name to identify this integration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isStandardMode
              ? 'Standard API Access Credentials'
              : 'Partner Integration Setup'}
          </CardTitle>
          <CardDescription className='flex items-start space-x-2'>
            <Info className='h-4 w-4 mt-0.5 shrink-0' />
            <span>
              {isStandardMode
                ? 'Get these credentials from your Toast Management Console under Integrations → API Access'
                : 'Connect your Toast account through the partner integration'}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Location Code - Same for both integration modes */}
          {!isStandardMode && (
            <div className='space-y-4'>
              <div className='p-4 bg-blue-50 dark:bg-blue-950 rounded-lg'>
                <div className='flex items-start space-x-2'>
                  <Info className='h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5' />
                  <div className='text-sm text-blue-800 dark:text-blue-200'>
                    <p className='font-medium mb-2'>Setup Instructions:</p>
                    <ol className='list-decimal list-inside space-y-1'>
                      <li>
                        A unique location code will be generated automatically
                      </li>
                      <li>Log in to your Toast Management Console</li>
                      {isStandardMode ? (
                        <>
                          <li>Navigate to Integrations → API Access</li>
                          <li>{`Click on "Manage Credentials"`}</li>
                          <li>Edit your Standard API credentials</li>
                          <li>{`Click on "Edit Location IDs"`}</li>
                          <li>Add the generated code below as a Location ID</li>
                        </>
                      ) : (
                        <>
                          <li>
                            Navigate to Integrations → Partner Integrations
                          </li>
                          <li>
                            {`Search for "Happy Bar" and click Add
                            Integration`}
                          </li>
                          <li>
                            {`Enter the generated code below in the "Location
                            ID" field`}
                          </li>
                          <li>Select the restaurant you want to connect</li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <div className='mb-2'>
                  <Label htmlFor='partnerLocationId'>
                    Your Location Code
                    {generatingCode && (
                      <span className='ml-2 text-sm text-muted-foreground'>
                        <Loader2 className='inline h-3 w-3 animate-spin mr-1' />
                        Generating...
                      </span>
                    )}
                  </Label>
                </div>

                <div className='flex space-x-2'>
                  <Input
                    id='partnerLocationId'
                    type='text'
                    placeholder={
                      generatingCode
                        ? 'Generating...'
                        : 'Location code will appear here'
                    }
                    value={formData.partnerLocationId || ''}
                    readOnly
                    className='font-mono text-lg tracking-wider bg-muted'
                  />
                  {formData.partnerLocationId && (
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      onClick={() => {
                        navigator.clipboard.writeText(
                          formData.partnerLocationId!
                        )
                      }}
                      title='Copy to clipboard'
                    >
                      <Copy className='h-4 w-4' />
                    </Button>
                  )}
                </div>

                <p className='text-sm text-muted-foreground mt-1'>
                  Enter this 6-digit code in your Toast{' '}
                  {isStandardMode
                    ? 'API Access Location IDs'
                    : 'Partner Integration'}
                </p>

                {formData.partnerLocationId &&
                  formData.partnerLocationId.length === 6 && (
                    <div className='mt-2 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800'>
                      <p className='text-sm text-green-800 dark:text-green-200'>
                        Your location code:{' '}
                        <span className='font-mono font-bold text-lg'>
                          {formData.partnerLocationId}
                        </span>
                      </p>
                    </div>
                  )}
              </div>

              <div className='flex items-center space-x-2 text-sm'>
                <ExternalLink className='h-4 w-4' />
                <a
                  href='https://www.toasttab.com/login'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:underline'
                >
                  Open Toast Management Console
                </a>
              </div>
            </div>
          )}

          {isStandardMode && (
            <>
              <div className='border-t pt-4'>
                <h4 className='text-sm font-medium mb-3'>API Credentials</h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='clientId'>Client ID</Label>
                    <Input
                      id='clientId'
                      type='text'
                      placeholder='Your Toast Client ID'
                      value={formData.clientId || ''}
                      onChange={(e) =>
                        handleInputChange('clientId', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='clientSecret'>Client Secret</Label>
                    <Input
                      id='clientSecret'
                      type='password'
                      placeholder='Your Toast Client Secret'
                      value={formData.clientSecret || ''}
                      onChange={(e) =>
                        handleInputChange('clientSecret', e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>
              <div className='border-t pt-4'>
                <h4 className='text-sm font-medium mb-3'>Restaurant GUID</h4>
                <div>
                  <Input
                    id='restaurantGUID'
                    type='text'
                    placeholder='Your Restaurant GUID'
                    value={formData.partnerLocationId || ''}
                    onChange={(e) =>
                      handleInputChange('partnerLocationId', e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Additional Setup Instructions */}
      {!isStandardMode && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Integration Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                Once you&apos;ve added the integration in Toast, you can test
                the connection below to verify everything is working correctly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Setup Instructions */}
      {isStandardMode && (
        <Card>
          <CardHeader>
            <CardTitle>Standard API Access Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                Make sure you&apos;ve added the location code in your Toast
                Management Console under API Access before testing the
                connection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Test Result */}
      {connectionTestResult && (
        <Card>
          <CardContent className='pt-6'>
            {connectionTestResult.success ? (
              <div className='space-y-2'>
                <div className='flex items-center space-x-2 text-green-600'>
                  <CheckCircle className='h-5 w-5' />
                  <span>Connection test successful!</span>
                </div>
                {connectionTestResult.restaurantCount !== undefined && (
                  <p className='text-sm text-muted-foreground ml-7'>
                    Found {connectionTestResult.restaurantCount} connected
                    restaurant
                    {connectionTestResult.restaurantCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className='space-y-2'>
                <div className='flex items-center space-x-2 text-red-600'>
                  <AlertTriangle className='h-5 w-5' />
                  <span>Connection test failed</span>
                </div>
                {connectionTestResult.error && (
                  <p className='text-sm text-muted-foreground ml-7'>
                    {connectionTestResult.error}
                  </p>
                )}
                {!isStandardMode && (
                  <p className='text-sm text-muted-foreground ml-7'>
                    Make sure you&apos;ve added Happy Bar in Toast Partner
                    Integrations first
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className='border-red-200 bg-red-50 dark:bg-red-950'>
          <CardContent className='pt-6'>
            <div className='flex items-start space-x-2'>
              <AlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400 mt-0.5' />
              <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className='flex justify-between'>
        <Button
          type='button'
          variant='outline'
          onClick={handleTestConnection}
          disabled={loading || testingConnection}
        >
          {testingConnection ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Testing Connection...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

        <div className='space-x-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={loading || testingConnection}>
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Creating...
              </>
            ) : (
              'Create Integration'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
