'use client'

import { useState, useEffect } from 'react'
import { posApi, type MenuGroup } from '@/lib/api/pos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw } from 'lucide-react'

interface MenuGroupSelectorProps {
  integrationId: string
  selectedGroupGuids?: string[]
  onSelectionChange: (selectedGroupGuids: string[]) => void
  onSync: (selectedGroupGuids: string[]) => void
  isLoading?: boolean
  disabled?: boolean
}

export function MenuGroupSelector({
  integrationId,
  selectedGroupGuids = [],
  onSelectionChange,
  onSync,
  isLoading = false,
  disabled = false,
}: MenuGroupSelectorProps) {
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localSelection, setLocalSelection] = useState<string[]>(selectedGroupGuids)

  useEffect(() => {
    if (integrationId) {
      fetchMenuGroups()
    }
  }, [integrationId])

  useEffect(() => {
    setLocalSelection(selectedGroupGuids)
  }, [selectedGroupGuids])

  const fetchMenuGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const groups = await posApi.getMenuGroups(integrationId)
      setMenuGroups(groups)
    } catch (err) {
      console.warn('Failed to fetch menu groups:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch menu groups')
    } finally {
      setLoading(false)
    }
  }

  const handleGroupToggle = (groupGuid: string, checked: boolean) => {
    const updatedSelection = checked
      ? [...localSelection, groupGuid]
      : localSelection.filter(id => id !== groupGuid)
    
    setLocalSelection(updatedSelection)
    onSelectionChange(updatedSelection)
  }

  const handleSelectAll = () => {
    const allGroupGuids = menuGroups.map(group => group.guid)
    setLocalSelection(allGroupGuids)
    onSelectionChange(allGroupGuids)
  }

  const handleSelectNone = () => {
    setLocalSelection([])
    onSelectionChange([])
  }

  const handleSync = () => {
    onSync(localSelection)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading menu groups...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchMenuGroups}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Menu Groups to Sync</CardTitle>
        <CardDescription>
          Choose which menu groups you want to sync. These settings will be saved as your default preferences. Leave empty to sync all groups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {menuGroups.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No menu groups found for this integration.</p>
            <Button 
              variant="outline" 
              onClick={fetchMenuGroups}
              className="mt-2"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <>
            {/* Selection controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={disabled || isLoading}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
                disabled={disabled || isLoading}
              >
                Select None
              </Button>
            </div>

            {/* Menu groups list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {menuGroups.map((group) => (
                <div key={group.guid} className="flex items-center space-x-2">
                  <Checkbox
                    id={group.guid}
                    checked={localSelection.includes(group.guid)}
                    onCheckedChange={(checked: boolean) => 
                      handleGroupToggle(group.guid, checked)
                    }
                    disabled={disabled || isLoading}
                  />
                  <label
                    htmlFor={group.guid}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {group.name}
                    <span className="text-muted-foreground ml-2">
                      ({group.items?.length || 0} items)
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {/* Sync button */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {localSelection.length === 0 
                    ? 'All groups will be synced'
                    : `${localSelection.length} group(s) selected`
                  }
                </span>
                <Button
                  onClick={handleSync}
                  disabled={disabled || isLoading}
                  className="min-w-24"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Save & Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}