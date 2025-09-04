'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { ArrowRight, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  useRecipeMappingSuggestions,
  useBulkCreateRecipePOSMappings,
} from '@/lib/queries/recipes'
import type { RecipeMappingSuggestion } from '@/lib/api/recipes'

interface RecipeMappingSuggestionsProps {
  integrationId: string
  integrationName: string
  onMappingCreated?: () => void
}

export function RecipeMappingSuggestions({
  integrationId,
  integrationName,
  onMappingCreated,
}: RecipeMappingSuggestionsProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  const {
    data: suggestions = [],
    isLoading: suggestionsLoading,
    error: suggestionsError,
    refetch: refetchSuggestions,
  } = useRecipeMappingSuggestions(integrationId)

  const bulkCreateMutation = useBulkCreateRecipePOSMappings()

  const handleSelectSuggestion = (suggestionKey: string, checked: boolean) => {
    const newSelected = new Set(selectedSuggestions)
    if (checked) {
      newSelected.add(suggestionKey)
    } else {
      newSelected.delete(suggestionKey)
    }
    setSelectedSuggestions(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = suggestions.map(s => `${s.recipeId}-${s.posProductId}`)
      setSelectedSuggestions(new Set(allKeys))
    } else {
      setSelectedSuggestions(new Set())
    }
  }

  const handleApplySelected = async () => {
    const selectedMappings = suggestions
      .filter(s => selectedSuggestions.has(`${s.recipeId}-${s.posProductId}`))
      .map(s => ({
        recipeId: s.recipeId,
        posProductId: s.posProductId,
        isActive: true,
      }))

    if (selectedMappings.length === 0) {
      toast.error('Please select at least one suggestion')
      return
    }

    try {
      await bulkCreateMutation.mutateAsync(selectedMappings)
      setSelectedSuggestions(new Set())
      refetchSuggestions()
      onMappingCreated?.()
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>
    } else if (confidence >= 0.6) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
    } else {
      return <Badge variant="outline" className="bg-red-50 text-red-600">Low</Badge>
    }
  }

  if (suggestionsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recipe Mapping Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered suggestions to map your recipes to {integrationName} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Failed to load suggestions. Please try again.
            </p>
            <Button onClick={() => refetchSuggestions()} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recipe Mapping Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered suggestions to map your recipes to {integrationName} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Finding recipe mapping suggestions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recipe Mapping Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered suggestions to map your recipes to {integrationName} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Set!</h3>
            <p className="text-sm text-muted-foreground">
              All your recipes are already mapped or no suitable matches were found.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Recipe Mapping Suggestions
        </CardTitle>
        <CardDescription>
          AI-powered suggestions to map your recipes to {integrationName} products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedSuggestions.size === suggestions.length}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm font-medium">
                Select All ({suggestions.length} suggestions)
              </Label>
            </div>
            <Button
              onClick={handleApplySelected}
              disabled={selectedSuggestions.size === 0 || bulkCreateMutation.isPending}
              size="sm"
            >
              {bulkCreateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Apply Selected ({selectedSuggestions.size})</>
              )}
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead>POS Product</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => {
                  const suggestionKey = `${suggestion.recipeId}-${suggestion.posProductId}`
                  const isSelected = selectedSuggestions.has(suggestionKey)

                  return (
                    <TableRow key={suggestionKey}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectSuggestion(suggestionKey, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{suggestion.recipeName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{suggestion.posProductName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getConfidenceBadge(suggestion.confidence)}
                          <span className="text-sm text-muted-foreground">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.reasons.slice(0, 2).map((reason) => (
                            <Badge key={reason} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                          {suggestion.reasons.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{suggestion.reasons.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}