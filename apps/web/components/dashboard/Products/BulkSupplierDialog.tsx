'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { suppliersApi, type Supplier } from '@/lib/api/suppliers'
import type { InventoryProduct } from '@happy-bar/types'
import { Building2, Loader2, Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface BulkSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProducts: InventoryProduct[]
  onComplete: () => void
}

export default function BulkSupplierDialog({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
}: BulkSupplierDialogProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(
    new Set()
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orderingPreferences, setOrderingPreferences] = useState<{
    orderingUnit: 'UNIT' | 'CASE'
    minimumOrder: number
  }>({
    orderingUnit: 'UNIT',
    minimumOrder: 1,
  })

  useEffect(() => {
    if (open) {
      loadSuppliers()
      // Reset state when dialog opens
      setSelectedSuppliers(new Set())
      setOrderingPreferences({
        orderingUnit: 'UNIT',
        minimumOrder: 1,
      })
    }
  }, [open])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const data = await suppliersApi.getSuppliers({ active: true })
      setSuppliers(data)
    } catch (error) {
      console.warn('Failed to load suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleSupplierToggle = (supplierId: string, checked: boolean) => {
    const newSelected = new Set(selectedSuppliers)
    if (checked) {
      newSelected.add(supplierId)
    } else {
      newSelected.delete(supplierId)
    }
    setSelectedSuppliers(newSelected)
  }

  const handleAssign = async () => {
    if (selectedSuppliers.size === 0) {
      toast.error('Please select at least one supplier')
      return
    }

    try {
      setSaving(true)
      let successCount = 0
      let errorCount = 0

      // For each selected product
      for (const product of selectedProducts) {
        // For each selected supplier
        for (const supplierId of selectedSuppliers) {
          try {
            // Check if relationship already exists
            const existingSuppliers = await suppliersApi.getProductSuppliers({
              productId: product.id,
            })

            const alreadyExists = existingSuppliers.some(
              (ps) => ps.supplierId === supplierId
            )

            if (!alreadyExists) {
              await suppliersApi.addProductToSupplier(supplierId, {
                productId: product.id,
                orderingUnit: orderingPreferences.orderingUnit,
                costPerUnit: product.costPerUnit,
                costPerCase:
                  product.costPerCase || product.costPerUnit * product.caseSize,
                packSize: product.caseSize,
                minimumOrder: orderingPreferences.minimumOrder,
                isPreferred: false,
              })
              successCount++
            }
          } catch (error) {
            console.warn(`Failed to assign ${product.name} to supplier:`, error)
            errorCount++
          }
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully assigned ${successCount} product-supplier relationship${successCount > 1 ? 's' : ''}`
        )
      }

      if (errorCount > 0) {
        toast.error(`Failed to create ${errorCount} assignments`)
      }

      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.warn('Failed to assign products to suppliers:', error)
      toast.error('Failed to assign products to suppliers')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Bulk Assign Products to Suppliers</DialogTitle>
          <DialogDescription>
            Assign {selectedProducts.length} selected product
            {selectedProducts.length !== 1 ? 's' : ''} to one or more suppliers
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Selected Products Summary */}
          <div className='p-3 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <Package className='size-4' />
              <span className='font-medium'>Selected Products</span>
            </div>
            <div className='flex flex-wrap gap-1'>
              {selectedProducts.slice(0, 5).map((product) => (
                <Badge key={product.id} variant='secondary'>
                  {product.name}
                </Badge>
              ))}
              {selectedProducts.length > 5 && (
                <Badge variant='outline'>
                  +{selectedProducts.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          {/* Supplier Selection */}
          <div>
            <Label className='mb-2'>Select Suppliers</Label>
            {loading ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='size-6 animate-spin' />
              </div>
            ) : suppliers.length === 0 ? (
              <div className='text-center py-4 text-muted-foreground'>
                No active suppliers found. Please create suppliers first.
              </div>
            ) : (
              <div className='space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3'>
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className='flex items-center space-x-2 p-2 hover:bg-gray-50 rounded'
                  >
                    <Checkbox
                      id={supplier.id}
                      checked={selectedSuppliers.has(supplier.id)}
                      onCheckedChange={(checked) =>
                        handleSupplierToggle(supplier.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={supplier.id}
                      className='flex-1 cursor-pointer flex items-center gap-2'
                    >
                      <Building2 className='size-4 text-muted-foreground' />
                      <span>{supplier.name}</span>
                      {supplier._count && (
                        <Badge variant='outline' className='ml-auto'>
                          {supplier._count.products} products
                        </Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Default Ordering Preferences */}
          <div className='space-y-3'>
            <Label>Default Ordering Preferences</Label>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label className='text-xs'>Ordering Unit</Label>
                <Select
                  value={orderingPreferences.orderingUnit}
                  onValueChange={(value) =>
                    setOrderingPreferences((prev) => ({
                      ...prev,
                      orderingUnit: value as 'UNIT' | 'CASE',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='UNIT'>Unit</SelectItem>
                    <SelectItem value='CASE'>Case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs'>Minimum Order</Label>
                <Input
                  type='number'
                  min='1'
                  value={orderingPreferences.minimumOrder}
                  onChange={(e) =>
                    setOrderingPreferences((prev) => ({
                      ...prev,
                      minimumOrder: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>
            <p className='text-xs text-muted-foreground'>
              Each product will use its own configured cost and pack size. You
              can adjust individual settings later in the product edit page.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={saving || selectedSuppliers.size === 0}
          >
            {saving ? (
              <>
                <Loader2 className='size-4 mr-2 animate-spin' />
                Assigning...
              </>
            ) : (
              `Assign to ${selectedSuppliers.size} Supplier${selectedSuppliers.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
