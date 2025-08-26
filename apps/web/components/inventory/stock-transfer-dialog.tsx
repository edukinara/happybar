'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { InventoryLevel, Location, Product } from '@happy-bar/types'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MapPin,
  Package,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const transferSchema = z
  .object({
    productId: z.string().min(1, 'Product is required'),
    fromLocationId: z.string().min(1, 'Source location is required'),
    toLocationId: z.string().min(1, 'Destination location is required'),
    quantity: z.number().positive('Quantity must be positive'),
    notes: z.string().optional(),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: 'Source and destination locations must be different',
    path: ['toLocationId'],
  })

type TransferFormData = z.infer<typeof transferSchema>

interface StockTransferDialogProps {
  trigger?: React.ReactNode
  products: Product[]
  locations: Location[]
  inventoryItems: InventoryLevel[]
  onTransfer: (data: TransferFormData) => Promise<void>
  defaultProductId?: string
  defaultFromLocationId?: string
}

export function StockTransferDialog({
  trigger,
  products,
  locations,
  inventoryItems,
  onTransfer,
  defaultProductId,
  defaultFromLocationId,
}: StockTransferDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      productId: defaultProductId || '',
      fromLocationId: defaultFromLocationId || '',
      toLocationId: '',
      quantity: 1,
      notes: '',
    },
  })

  const watchedValues = form.watch()
  const { productId, fromLocationId, toLocationId } = watchedValues

  // Get current inventory for the selected product and location
  const sourceInventory = inventoryItems.find(
    (item) => item.productId === productId && item.locationId === fromLocationId
  )

  const destinationInventory = inventoryItems.find(
    (item) => item.productId === productId && item.locationId === toLocationId
  )

  const selectedProduct = products.find((p) => p.id === productId)
  const selectedFromLocation = locations.find((l) => l.id === fromLocationId)
  const selectedToLocation = locations.find((l) => l.id === toLocationId)

  const availableQuantity = sourceInventory?.currentQuantity || 0
  const isInsufficientStock = watchedValues.quantity > availableQuantity

  const onSubmit = async (data: TransferFormData) => {
    if (isInsufficientStock) {
      toast.error('Insufficient stock for transfer')
      return
    }

    setIsSubmitting(true)
    try {
      await onTransfer(data)
      toast.success('Stock transfer completed successfully')
      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transfer failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant='outline' size='sm'>
            <ArrowRight className='h-4 w-4 mr-2' />
            Transfer Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Transfer Stock Between Locations</DialogTitle>
          <DialogDescription>
            Move inventory from one location to another. This will update stock
            levels at both locations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Product Selection */}
            <FormField
              control={form.control}
              name='productId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select product to transfer' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className='flex items-center gap-2'>
                            <Package className='h-4 w-4' />
                            <span>{product.name}</span>
                            {product.sku && (
                              <Badge variant='outline' className='ml-2'>
                                {product.sku}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transfer Direction */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
              {/* From Location */}
              <FormField
                control={form.control}
                name='fromLocationId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Location</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Source' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className='flex items-center gap-2'>
                              <MapPin className='h-4 w-4' />
                              <span>{location.name}</span>
                              {location.code && (
                                <Badge variant='outline'>{location.code}</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Arrow */}
              <div className='flex justify-center pb-2'>
                <ArrowRight className='h-5 w-5 text-muted-foreground' />
              </div>

              {/* To Location */}
              <FormField
                control={form.control}
                name='toLocationId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Location</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Destination' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations
                          .filter((location) => location.id !== fromLocationId)
                          .map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div className='flex items-center gap-2'>
                                <MapPin className='h-4 w-4' />
                                <span>{location.name}</span>
                                {location.code && (
                                  <Badge variant='outline'>
                                    {location.code}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Transfer Summary */}
            {selectedProduct && selectedFromLocation && selectedToLocation && (
              <div className='bg-muted/50 rounded-lg p-4 space-y-3'>
                <h4 className='font-medium'>Transfer Summary</h4>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-muted-foreground'>Product:</span>
                    <p className='font-medium'>{selectedProduct.name}</p>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Unit:</span>
                    <p className='font-medium'>{selectedProduct.unit}</p>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>
                      Available at source:
                    </span>
                    <p className='font-medium'>
                      {availableQuantity} {selectedProduct.unit}
                      {availableQuantity <
                        (sourceInventory?.minimumQuantity || 0) && (
                        <Badge variant='destructive' className='ml-2'>
                          Low Stock
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>
                      Current at destination:
                    </span>
                    <p className='font-medium'>
                      {destinationInventory?.currentQuantity || 0}{' '}
                      {selectedProduct.unit}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Input */}
            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity to Transfer</FormLabel>
                  <FormControl>
                    <div className='flex flex-row'>
                      <Input
                        type='number'
                        step='0.1'
                        min='0.1'
                        max={availableQuantity}
                        placeholder='Enter quantity'
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        className={
                          isInsufficientStock ? 'border-destructive' : ''
                        }
                        disabled={isInsufficientStock}
                      />
                      {/* {selectedProduct && (
                        <div className='absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground'>
                          {selectedProduct.container}
                        </div>
                      )} */}
                    </div>
                  </FormControl>
                  {isInsufficientStock && (
                    <div className='flex items-center gap-2 text-sm text-destructive'>
                      <AlertTriangle className='h-4 w-4' />
                      <span>
                        Insufficient stock. Available: {availableQuantity}
                      </span>
                    </div>
                  )}
                  {availableQuantity > 0 && (
                    <FormDescription>
                      Available: {availableQuantity}{' '}
                      {selectedProduct?.container}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Add any notes about this transfer...'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes will be included in the transfer record
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={
                  isSubmitting || isInsufficientStock || !form.formState.isValid
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRight className='h-4 w-4 mr-2' />
                    Transfer Stock
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
