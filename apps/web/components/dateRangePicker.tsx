'use client'

import { ChevronDownIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export const dateToStartOrEnd = (
  date: Date,
  start: boolean,
  offSet?: number
) => {
  const newDate = new Date(date)
  newDate.setHours(
    start ? 0 : 23,
    start ? 0 : 59,
    start ? 0 : 59,
    start ? 0 : 999
  )
  if (!!offSet) {
    const d = newDate.getTime()
    const dateWithOffset = d + offSet * 60 * 60 * 1000
    newDate.setTime(dateWithOffset)
  }
  return newDate
}

interface DateRangePickerProps {
  range: DateRange | undefined
  setRange: (range: DateRange | undefined) => void
  setDateFilter: (dateFilter: DateRange | undefined) => void
  offSet?: number
}

export default function DateRangePicker({
  range,
  setRange,
  setDateFilter,
  offSet,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          id='dates'
          className='w-56 justify-between font-normal'
        >
          {range?.from && range?.to
            ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
            : 'Select date'}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
        <Calendar
          mode='range'
          selected={range}
          captionLayout='dropdown'
          onSelect={(newRange) => {
            setRange(newRange)
            if (newRange?.from && newRange?.to) {
              const from = dateToStartOrEnd(newRange.from, true, offSet)
              const to = dateToStartOrEnd(newRange.to, false, offSet)
              setDateFilter({ from, to })
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
