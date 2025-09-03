'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useDebounce } from '@/hooks/use-debounce'
import { useCatalog } from '@/lib/queries/products'
import type { CatalogProduct, InventoryProduct } from '@happy-bar/types'
import { Check, Loader2, Package, Search, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface ProductMatch {
  product: InventoryProduct
  suggestedMatches: CatalogProduct[]
  selectedMatch: CatalogProduct | null
  status: 'pending' | 'matched' | 'skipped'
  confidence: number
}

interface BulkCatalogMatchingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProducts: InventoryProduct[]
  onMatchingComplete: (matches: ProductMatch[]) => void
}

export default function BulkCatalogMatchingDialog({
  open,
  onOpenChange,
  selectedProducts,
  onMatchingComplete,
}: BulkCatalogMatchingDialogProps) {
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSearchTerm, setCurrentSearchTerm] = useState('')
  const [searchingForProductId, setSearchingForProductId] = useState<
    string | null
  >(null)
  const [manualSearchTerm, setManualSearchTerm] = useState('')
  const [isManualSearchActive, setIsManualSearchActive] = useState(false)

  // Debounce the manual search term
  const debouncedManualSearch = useDebounce(manualSearchTerm, 500)

  // Ref to track the last processed search to prevent infinite loops
  const lastProcessedSearchRef = useRef<string>('')

  // Ref for manual search input
  const manualSearchInputRef = useRef<HTMLInputElement>(null)

  // Catalog search for current product suggestions and manual matching
  const {
    data: catalogProducts = [],
    error: catalogError,
    isLoading: catalogLoading,
  } = useCatalog({
    search: currentSearchTerm,
    limit: 20,
  })

  // Track if dialog was previously open to prevent re-initialization
  const wasOpenRef = useRef(false)
  const selectedProductIdsRef = useRef<string[]>([])
  const hasInitializedRef = useRef(false)

  const searchForCurrentProduct = useCallback((match: ProductMatch) => {
    const { product } = match

    // Search by UPC first, then by name
    const searchTerm = product.upc || product.name
    if (searchTerm) {
      setSearchingForProductId(product.id)
      setCurrentSearchTerm(searchTerm)
    }
  }, [])

  // Initialize product matches when dialog opens or products change
  useEffect(() => {
    if (!open) {
      // Clear state when dialog closes
      if (wasOpenRef.current) {
        setProductMatches([])
        setCurrentIndex(0)
        setCurrentSearchTerm('')
        setSearchingForProductId(null)
        setManualSearchTerm('')
        setIsManualSearchActive(false)
        lastProcessedSearchRef.current = ''
        selectedProductIdsRef.current = []
        hasInitializedRef.current = false
      }
      wasOpenRef.current = false
      return
    }

    // Dialog is open
    const currentProductIds = selectedProducts.map((p) => p.id).sort()
    const previousProductIds = selectedProductIdsRef.current.sort()
    const productsChanged =
      currentProductIds.length !== previousProductIds.length ||
      currentProductIds.some((id, index) => id !== previousProductIds[index])

    if (selectedProducts.length > 0) {
      if (!hasInitializedRef.current || productsChanged) {
        // Initialize or reinitialize if products actually changed
        const initialMatches: ProductMatch[] = selectedProducts.map(
          (product) => ({
            product,
            suggestedMatches: [],
            selectedMatch: null,
            status: 'pending' as const,
            confidence: 0,
          })
        )
        setProductMatches(initialMatches)
        setCurrentIndex(0)
        // Start by searching for the first product
        if (initialMatches[0]) {
          searchForCurrentProduct(initialMatches[0])
        }

        selectedProductIdsRef.current = currentProductIds
        hasInitializedRef.current = true
      } else if (productMatches.length > 0) {
        // Just update product data references without resetting state
        const updatedProductsMap = new Map(
          selectedProducts.map((p) => [p.id, p])
        )

        setProductMatches((prev) =>
          prev.map((match) => {
            const updatedProduct = updatedProductsMap.get(match.product.id)
            return updatedProduct
              ? { ...match, product: updatedProduct }
              : match
          })
        )
      }
    }

    wasOpenRef.current = true
  }, [open, selectedProducts, searchForCurrentProduct, productMatches.length])

  // Search for matches when current product changes
  useEffect(() => {
    if (productMatches.length > 0 && currentIndex < productMatches.length) {
      const currentMatch = productMatches[currentIndex]
      if (
        currentMatch &&
        currentMatch.suggestedMatches.length === 0 &&
        currentMatch.status === 'pending'
      ) {
        searchForCurrentProduct(currentMatch)
      }
    }
  }, [currentIndex, productMatches])

  const handleManualSearch = () => {
    if (manualSearchTerm.trim()) {
      setIsManualSearchActive(true)
    }
  }

  const clearManualSearch = useCallback(() => {
    setManualSearchTerm('')
    setIsManualSearchActive(false)
    lastProcessedSearchRef.current = ''
    if (productMatches[currentIndex]) {
      // Reset to original search term
      const currentMatch = productMatches[currentIndex]
      searchForCurrentProduct(currentMatch)
    }
  }, [currentIndex, productMatches, searchForCurrentProduct])

  const handleManualSearchInput = useCallback(
    (value: string) => {
      setManualSearchTerm(value)
      if (value.trim()) {
        setIsManualSearchActive(true)
      } else {
        setIsManualSearchActive(false)
        // If clearing the search, reset to original automatic search
        const currentMatch = productMatches[currentIndex]
        if (currentMatch) {
          searchForCurrentProduct(currentMatch)
        }
      }
    },
    [currentIndex, productMatches, searchForCurrentProduct]
  )

  // Handle catalog search errors
  useEffect(() => {
    if (catalogError) {
      console.warn('Catalog search error:', catalogError)
      toast.error('Failed to search catalog. Please try again.')
    }
  }, [catalogError])

  // Handle debounced manual search
  useEffect(() => {
    if (debouncedManualSearch.trim() && isManualSearchActive) {
      setCurrentSearchTerm(debouncedManualSearch.trim())
    }
  }, [debouncedManualSearch, isManualSearchActive])

  // Update suggestions when catalog search results come in
  useEffect(() => {
    if (catalogProducts.length > 0 && currentSearchTerm.trim() !== '') {
      setProductMatches((prev) => {
        // Always update the current product when we have search results
        const currentMatch = prev[currentIndex]

        if (currentMatch) {
          const newMatches = [...prev]
          const confidence = calculateNameMatchConfidence(
            currentMatch.product.name,
            catalogProducts
          )

          // Always update when we have search results - we only get here when there's a valid search
          const shouldUpdate = true

          if (shouldUpdate) {
            newMatches[currentIndex] = {
              ...currentMatch,
              suggestedMatches: catalogProducts,
              selectedMatch: null,
              status: 'pending',
              confidence,
            }

            return newMatches
          }
        }

        return prev
      })

      // Clear the searching flag if it was set
      if (searchingForProductId) {
        setSearchingForProductId(null)
      }
    }
  }, [catalogProducts, currentSearchTerm, currentIndex, searchingForProductId])

  const calculateNameMatchConfidence = (
    productName: string,
    catalogMatches: CatalogProduct[]
  ): number => {
    if (catalogMatches.length === 0) return 0

    const firstMatch = catalogMatches[0]
    if (!firstMatch) return 0

    const similarity = calculateStringSimilarity(
      productName.toLowerCase(),
      firstMatch.name.toLowerCase()
    )
    return Math.round(similarity * 100)
  }

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    // Simple similarity calculation - could be improved with better algorithms
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          )
        }
      }
    }
    return matrix[str2.length]![str1.length]!
  }

  const handleMatchSelect = (catalogProduct: CatalogProduct) => {
    setProductMatches((prev) => {
      const newMatches = [...prev]
      const currentMatch = newMatches[currentIndex]
      if (currentMatch) {
        newMatches[currentIndex] = {
          ...currentMatch,
          selectedMatch: catalogProduct,
          status: 'matched',
          confidence: 100,
        }
      }
      return newMatches
    })
  }

  const handleSkip = () => {
    setProductMatches((prev) => {
      const newMatches = [...prev]
      const currentMatch = newMatches[currentIndex]
      if (currentMatch) {
        newMatches[currentIndex] = {
          ...currentMatch,
          status: 'skipped',
        }
      }
      return newMatches
    })
    goToNext()
  }

  const goToNext = () => {
    if (currentIndex < productMatches.length - 1) {
      // Clear search state to prevent race conditions
      setCurrentSearchTerm('')
      setSearchingForProductId(null)
      setManualSearchTerm('')
      setIsManualSearchActive(false)
      lastProcessedSearchRef.current = ''
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      // Clear search state to prevent race conditions
      setCurrentSearchTerm('')
      setSearchingForProductId(null)
      setManualSearchTerm('')
      setIsManualSearchActive(false)
      lastProcessedSearchRef.current = ''
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleComplete = () => {
    onMatchingComplete(productMatches)
    onOpenChange(false)

    const matchedCount = productMatches.filter(
      (m) => m.status === 'matched'
    ).length
    toast.success(
      `Successfully matched ${matchedCount} of ${productMatches.length} products`
    )
  }

  const progress =
    productMatches.length > 0
      ? ((currentIndex + 1) / productMatches.length) * 100
      : 0
  const currentMatch = productMatches[currentIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='md:min-w-3xl max-h-[90vh] overflow-hidden py-4'
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Bulk Product Catalog Matching</DialogTitle>
          <DialogDescription>
            Match your products with catalog items to auto-fill details
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span>
              Progress: {currentIndex + 1} of {productMatches.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className='w-full' />
        </div>

        {currentMatch ? (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6'>
            {/* Current Product */}
            <div className='space-y-4 min-w-0'>
              <div className='flex items-center gap-2'>
                <Package className='w-5 h-5' />
                <h3 className='font-semibold'>Current Product</h3>
              </div>

              <div className='border rounded-lg p-4 space-y-2'>
                <div className='flex items-center gap-3'>
                  {currentMatch.product.image && (
                    <div className='relative w-12 h-12 flex-shrink-0 rounded border bg-muted'>
                      <Image
                        src={currentMatch.product.image}
                        alt={currentMatch.product.name}
                        fill
                        className='object-contain'
                        sizes='48px'
                      />
                    </div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <h4 className='font-medium truncate'>
                      {currentMatch.product.name}
                    </h4>
                    {currentMatch.product.sku && (
                      <p className='text-sm text-muted-foreground truncate'>
                        SKU: {currentMatch.product.sku}
                      </p>
                    )}
                    {currentMatch.product.upc && (
                      <p className='text-sm text-muted-foreground truncate'>
                        UPC: {currentMatch.product.upc}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className='flex items-center gap-2'>
                {currentMatch.status === 'matched' && (
                  <>
                    <Check className='w-4 h-4 text-green-600 flex-shrink-0' />
                    <span className='text-sm text-green-600'>Matched</span>
                  </>
                )}
                {currentMatch.status === 'skipped' && (
                  <>
                    <XCircle className='w-4 h-4 text-orange-600 flex-shrink-0' />
                    <span className='text-sm text-orange-600'>Skipped</span>
                  </>
                )}
                {currentMatch.status === 'pending' && (
                  <span className='text-sm text-muted-foreground'>
                    Select a catalog match below
                  </span>
                )}
              </div>
            </div>

            {/* Catalog Suggestions */}
            <div className='space-y-4 min-w-0'>
              <div className='flex items-center gap-2'>
                <Search className='w-5 h-5' />
                <h3 className='font-semibold'>Catalog Suggestions</h3>
                {/* {isManualSearchActive && manualSearchTerm && (
                  <Badge variant='secondary' className='text-xs'>
                    Manual: &ldquo;{manualSearchTerm}&rdquo;
                  </Badge>
                )} */}
                <Badge variant='outline' className='text-xs'>
                  {currentMatch?.suggestedMatches?.length || 0} matches
                </Badge>
              </div>

              <ScrollArea className='h-72 border rounded-lg p-2'>
                {catalogLoading ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='text-center space-y-2'>
                      <Search className='w-6 h-6 animate-pulse mx-auto text-muted-foreground' />
                      <p className='text-sm text-muted-foreground'>
                        Searching catalog...
                      </p>
                    </div>
                  </div>
                ) : currentMatch.suggestedMatches.length > 0 ? (
                  <div className='space-y-2'>
                    {currentMatch.suggestedMatches.map((catalog) => (
                      <div
                        key={catalog.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          currentMatch.selectedMatch?.id === catalog.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => handleMatchSelect(catalog)}
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          {catalog.image && (
                            <div className='relative w-8 h-8 flex-shrink-0 rounded border bg-muted'>
                              <Image
                                src={catalog.image}
                                alt={catalog.name}
                                fill
                                className='object-contain'
                                sizes='32px'
                              />
                            </div>
                          )}
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium text-sm truncate'>
                              {catalog.name}
                            </p>
                            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                              {catalog.category && (
                                <Badge
                                  variant='outline'
                                  className='text-xs flex-shrink-0'
                                >
                                  {catalog.category.name}
                                </Badge>
                              )}
                              {catalog.upc && (
                                <span className='truncate'>
                                  UPC: {catalog.upc}
                                </span>
                              )}
                            </div>
                            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                              {catalog.unitSize && catalog.unit && (
                                <span>
                                  {catalog.unitSize}
                                  {catalog.unit}
                                </span>
                              )}
                              {catalog.container && (
                                <span>{catalog.container}</span>
                              )}
                              {catalog.caseSize && (
                                <span>Case: {catalog.caseSize}</span>
                              )}
                            </div>
                          </div>
                          {currentMatch.selectedMatch?.id === catalog.id && (
                            <Check className='w-4 h-4 text-primary flex-shrink-0' />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='py-1 space-y-2 px-1'>
                    <p className='text-muted-foreground'>
                      {catalogError
                        ? 'Failed to load catalog matches'
                        : 'No catalog matches found'}
                    </p>

                    {!catalogError && (
                      <div className='space-y-2'>
                        <div className='flex gap-2'>
                          <div className='relative flex-1'>
                            <Input
                              ref={manualSearchInputRef}
                              placeholder='Search catalog manually...'
                              value={manualSearchTerm}
                              onChange={(e) =>
                                handleManualSearchInput(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleManualSearch()
                                }
                              }}
                              className='flex-1'
                              disabled={catalogLoading}
                            />
                            {catalogLoading && isManualSearchActive && (
                              <Loader2 className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground' />
                            )}
                          </div>
                          <Button
                            onClick={handleManualSearch}
                            disabled={
                              !manualSearchTerm.trim() || catalogLoading
                            }
                            size='sm'
                          >
                            {catalogLoading && isManualSearchActive ? (
                              <Loader2 className='w-4 h-4 animate-spin' />
                            ) : (
                              <Search className='w-4 h-4' />
                            )}
                          </Button>
                          {manualSearchTerm && (
                            <Button
                              onClick={clearManualSearch}
                              variant='outline'
                              size='sm'
                              disabled={catalogLoading}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Manual search input - always show when there are results */}
              {currentMatch?.suggestedMatches &&
                currentMatch.suggestedMatches.length > 0 && (
                  <div className='space-y-2 pt-2 border-t'>
                    <p className='text-xs text-muted-foreground'>
                      Search again or try different terms:
                    </p>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          placeholder='Search catalog manually...'
                          value={manualSearchTerm}
                          onChange={(e) =>
                            handleManualSearchInput(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleManualSearch()
                            }
                          }}
                          className='flex-1'
                          disabled={catalogLoading}
                        />
                        {catalogLoading && isManualSearchActive && (
                          <Loader2 className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground' />
                        )}
                      </div>
                      <Button
                        onClick={handleManualSearch}
                        disabled={!manualSearchTerm.trim() || catalogLoading}
                        size='sm'
                      >
                        {catalogLoading && isManualSearchActive ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <Search className='w-4 h-4' />
                        )}
                      </Button>
                      <Button
                        onClick={clearManualSearch}
                        variant='outline'
                        size='sm'
                        disabled={catalogLoading}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        ) : null}

        <Separator />

        {/* Navigation */}
        <div className='flex flex-col sm:flex-row justify-between gap-3'>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              size='sm'
            >
              Previous
            </Button>
            <Button variant='outline' onClick={handleSkip} size='sm'>
              Skip
            </Button>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              size='sm'
            >
              Cancel
            </Button>
            {currentIndex < productMatches.length - 1 ? (
              <Button onClick={goToNext} size='sm'>
                Next
              </Button>
            ) : (
              <Button onClick={handleComplete} size='sm'>
                Complete Matching
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
