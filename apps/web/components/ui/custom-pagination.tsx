'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  className?: string
  showItemsPerPage?: boolean
  itemsPerPageOptions?: number[]
}

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
export function CustomPagination({
  currentPage,
  totalPages,
  totalItems: _,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = '',
  showItemsPerPage = true,
  itemsPerPageOptions = [10, 20, 50, 100],
}: CustomPaginationProps) {
  const getVisiblePages = () => {
    if (totalPages <= 1) return [1]

    const delta = 2
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    // Always add page 1
    rangeWithDots.push(1)

    // Add dots before range if needed
    if (currentPage - delta > 2) {
      rangeWithDots.push('...')
    }

    // Add middle range (avoid duplicating page 1 or totalPages)
    range.forEach((page) => {
      if (page !== 1 && page !== totalPages) {
        rangeWithDots.push(page)
      }
    })

    // Add dots after range if needed
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...')
    }

    // Add last page if not already included
    if (totalPages > 1 && !rangeWithDots.includes(totalPages)) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  if (totalPages <= 1 && !showItemsPerPage) {
    return null
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className='flex items-center space-x-4'>
        {showItemsPerPage && (
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-muted-foreground text-nowrap'>
              Items per page:
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className='w-20'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <Pagination className='justify-end'>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage !== 1 && onPageChange(currentPage - 1)}
            />
          </PaginationItem>
          {getVisiblePages().map((page, index) => {
            if (page === '...') {
              return (
                <PaginationItem key={`dots-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              )
            }

            const pageNumber = page as number
            return (
              <PaginationItem key={`page-${pageNumber}`}>
                <PaginationLink
                  onClick={() => onPageChange(pageNumber)}
                  isActive={currentPage === pageNumber}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              onClick={() =>
                currentPage !== totalPages && onPageChange(currentPage + 1)
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
