'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryApi, type InventoryTransaction } from '@/lib/api/inventory'
import type { InventoryLevel } from '@happy-bar/types'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ClipboardList,
  History,
  Loader2,
  Package,
  ShoppingCart,
} from 'lucide-react'
import pluralize from 'pluralize'
import { useEffect, useState } from 'react'

interface TransactionHistoryDrawerProps {
  inventoryItem: InventoryLevel
  open: boolean
  setOpen: (open: boolean) => void
}

export function TransactionHistoryDrawer({
  inventoryItem,
  open,
  setOpen,
}: TransactionHistoryDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (open) {
      fetchTransactions()
    }
  }, [open])

  const fetchTransactions = async () => {
    try {
      setLoading(true)

      // Fetch comprehensive transaction history from the new API
      const response = await inventoryApi.getTransactionHistory({
        productId: inventoryItem.productId,
        locationId: inventoryItem.locationId,
        limit: 200,
      })

      setTransactions(response.transactions)
    } catch (error) {
      console.warn('Failed to fetch transactions:', error)
      // For now, show empty state if API fails
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (
    type: InventoryTransaction['type'],
    quantity?: number
  ) => {
    switch (type) {
      case 'count':
        return <ClipboardList className='h-4 w-4' />
      case 'adjustment':
        return <Package className='h-4 w-4' />
      case 'sale':
        return <ShoppingCart className='h-4 w-4' />
      case 'transfer':
        return quantity && quantity > 0 ? (
          <ArrowDownRight className='h-4 w-4' />
        ) : (
          <ArrowUpRight className='h-4 w-4' />
        )
      case 'receipt':
        return <ArrowDownRight className='h-4 w-4' />
      default:
        return <History className='h-4 w-4' />
    }
  }

  const getTransactionColor = (type: InventoryTransaction['type']) => {
    switch (type) {
      case 'count':
        return 'bg-blue-100 text-blue-800'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800'
      case 'sale':
        return 'bg-red-100 text-red-800'
      case 'transfer':
        return 'bg-purple-100 text-purple-800'
      case 'receipt':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    }
  }

  const filteredTransactions =
    activeTab === 'all'
      ? transactions
      : transactions.filter((t) => t.type === activeTab)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant='ghost' size='sm' title='View transaction history'>
          <History className='h-4 w-4' />
        </Button>
      </SheetTrigger>
      <SheetContent className='w-[500px] sm:w-[540px] p-2 gap-2'>
        <SheetHeader className='p-0 m-0'>
          <SheetTitle>Transaction History</SheetTitle>
          <SheetDescription>
            View transaction history for this inventory item
          </SheetDescription>
        </SheetHeader>
        <div className='space-y-1 mt-4'>
          <div className='font-bold text-foreground'>
            {inventoryItem.product.name}
          </div>
          <div className='text-sm text-muted-foreground'>
            {inventoryItem.location.name} • Current:{' '}
            {+inventoryItem.currentQuantity.toFixed(2)}{' '}
            {inventoryItem.currentQuantity !== 1
              ? pluralize(inventoryItem.product.container || 'unit')
              : inventoryItem.product.container || 'unit'}
          </div>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        ) : (
          <div className='mt-6'>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className='grid w-full grid-cols-6'>
                <TabsTrigger value='all'>All</TabsTrigger>
                <TabsTrigger value='count'>Counts</TabsTrigger>
                <TabsTrigger value='adjustment'>Adjust</TabsTrigger>
                <TabsTrigger value='sale'>Sales</TabsTrigger>
                <TabsTrigger value='transfer'>Transfer</TabsTrigger>
                <TabsTrigger value='receipt'>Receipt</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className='mt-4'>
                <ScrollArea className='h-[calc(100vh-280px)]'>
                  <div className='space-y-4 pr-4'>
                    {filteredTransactions.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        No {activeTab === 'all' ? '' : activeTab} transactions
                        found
                      </div>
                    ) : (
                      filteredTransactions.map((transaction) => {
                        const { date, time } = formatDate(transaction.date)
                        const metadata = transaction.metadata || {}

                        return (
                          <div
                            key={transaction.id}
                            className='border rounded-lg p-4 space-y-2'
                          >
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-2'>
                                <div
                                  className={`p-2 rounded-lg ${getTransactionColor(
                                    transaction.type
                                  )}`}
                                >
                                  {getTransactionIcon(
                                    transaction.type,
                                    transaction.quantity
                                  )}
                                </div>
                                <div>
                                  <div className='font-medium capitalize'>
                                    {transaction.type}
                                    {metadata.overDepletion && (
                                      <span className='text-xs ml-2 text-orange-600'>
                                        (Over-depletion)
                                      </span>
                                    )}
                                  </div>
                                  <div className='text-xs text-muted-foreground flex items-center gap-1'>
                                    <Calendar className='h-3 w-3' />
                                    {date} at {time}
                                  </div>
                                </div>
                              </div>
                              <div className='text-right'>
                                <div
                                  className={`font-bold text-lg ${
                                    transaction.quantity >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {transaction.quantity >= 0 ? '+' : ''}
                                  {transaction.quantity.toFixed(2)}
                                </div>
                                {transaction.fromQuantity !== undefined &&
                                  transaction.toQuantity !== undefined && (
                                    <div className='text-xs text-muted-foreground'>
                                      {transaction.fromQuantity.toFixed(2)} →{' '}
                                      {transaction.toQuantity.toFixed(2)}
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Additional details */}
                            <div className='grid grid-cols-2 gap-2 text-sm'>
                              {transaction.reference && (
                                <div>
                                  <span className='text-muted-foreground'>
                                    {transaction.type === 'sale'
                                      ? 'Price:'
                                      : 'Reference:'}
                                  </span>{' '}
                                  <span className='font-medium'>
                                    {transaction.type === 'sale'
                                      ? `$${Number(transaction.reference).toFixed(2)}`
                                      : transaction.reference}
                                  </span>
                                </div>
                              )}
                              {transaction.type === 'sale' ? (
                                <div>
                                  <span className='text-muted-foreground'>
                                    Quantity:
                                  </span>{' '}
                                  <span className='font-medium'>
                                    {transaction.metadata?.quantity}
                                  </span>
                                </div>
                              ) : (
                                transaction.performedBy && (
                                  <div>
                                    <span className='text-muted-foreground'>
                                      By:
                                    </span>{' '}
                                    <span className='font-medium'>
                                      {transaction.performedBy}
                                    </span>
                                  </div>
                                )
                              )}
                              {transaction.reason && (
                                <div>
                                  <span className='text-muted-foreground'>
                                    Reason:
                                  </span>{' '}
                                  <span className='font-medium'>
                                    {transaction.reason}
                                  </span>
                                </div>
                              )}
                              {metadata.fromLocation && metadata.toLocation && (
                                <div className='col-span-2'>
                                  <span className='text-muted-foreground'>
                                    Transfer:
                                  </span>{' '}
                                  <span className='font-medium'>
                                    {metadata.fromLocation} →{' '}
                                    {metadata.toLocation}
                                  </span>
                                </div>
                              )}
                              {metadata.areaName && (
                                <div>
                                  <span className='text-muted-foreground'>
                                    Area:
                                  </span>{' '}
                                  <span className='font-medium'>
                                    {metadata.areaName}
                                  </span>
                                </div>
                              )}
                              {metadata.source && (
                                <div>
                                  <span className='text-muted-foreground'>
                                    Source:
                                  </span>{' '}
                                  <span className='font-medium'>
                                    {metadata.source}
                                  </span>
                                </div>
                              )}
                            </div>

                            {transaction.notes && (
                              <div className='text-sm text-muted-foreground pt-1 border-t'>
                                {transaction.notes}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
