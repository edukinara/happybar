'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDebounce } from '@/hooks/use-debounce'
import { useCatalog } from '@/lib/queries/products'
import type { CatalogProduct } from '@happy-bar/types'
import { ChevronsUpDown, Package, Search } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface CatalogSearchProps {
  onSelect: (product: CatalogProduct) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function CatalogSearch({
  onSelect,
  placeholder = 'Search product catalog...',
  disabled = false,
  className = '',
}: CatalogSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Use the catalog search hook with debounced search term
  const { data: catalogProducts = [], isLoading } = useCatalog({
    search: debouncedSearch,
    limit: 20,
  })

  const handleSelect = (product: CatalogProduct) => {
    onSelect(product)
    setOpen(false)
    setSearchTerm('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={`justify-between ${className}`}
        >
          <div className='flex items-center gap-2'>
            <Search className='h-4 w-4' />
            {placeholder}
          </div>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[500px] p-0' align='start'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder='Type product name or UPC...'
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {searchTerm.length < 3 ? (
              <CommandEmpty>
                Type at least 3 characters to search the catalog
              </CommandEmpty>
            ) : isLoading ? (
              <CommandEmpty>Searching catalog...</CommandEmpty>
            ) : catalogProducts.length === 0 ? (
              <CommandEmpty>No products found in catalog</CommandEmpty>
            ) : (
              <CommandGroup heading='Catalog Products'>
                {catalogProducts.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => handleSelect(product)}
                    className='flex flex-col items-start gap-1 py-3'
                  >
                    <div className='flex flex-row items-center w-full gap-2'>
                      {product.image ? (
                        <div className='relative size-12 overflow-hidden'>
                          <Image
                            src={product.image}
                            alt={product.name || 'Product image'}
                            fill
                            className='object-contain'
                            sizes='128px'
                            onError={() => {}}
                          />
                        </div>
                      ) : (
                        <Package className='h-4 w-4 text-muted-foreground' />
                      )}
                      <div className='w-full'>
                        <div className='flex items-center justify-between w-full'>
                          <div className='flex items-center'>
                            <span className='font-medium'>{product.name}</span>
                          </div>
                          {product.category && (
                            <Badge variant='outline' className='text-xs'>
                              {product.category.name}
                            </Badge>
                          )}
                        </div>
                        <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                          {product.upc && <span>UPC: {product.upc}</span>}
                          {product.unitSize && product.unit && (
                            <span>
                              {product.unitSize}
                              {product.unit}
                            </span>
                          )}
                          {product.container && (
                            <span>{product.container}</span>
                          )}
                          {product.caseSize && (
                            <span>Case: {product.caseSize}</span>
                          )}
                        </div>
                        {(product.costPerUnit || product.costPerCase) && (
                          <div className='flex items-center gap-3 text-xs'>
                            {product.costPerUnit && (
                              <span className='text-green-600'>
                                Unit: ${product.costPerUnit.toFixed(2)}
                              </span>
                            )}
                            {product.costPerCase && (
                              <span className='text-green-600'>
                                Case: ${product.costPerCase.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
