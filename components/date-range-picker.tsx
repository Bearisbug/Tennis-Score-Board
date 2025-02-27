"use client"

import { useState, useEffect } from "react"
import { DateSelect } from "./date-select"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"

interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange | undefined) => void
  onReset: () => void
  isActive: boolean
}

export default function DateRangePicker({ onDateRangeChange, onReset, isActive }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (!isActive) {
      setStartDate(new Date().toISOString().split("T")[0])
      setEndDate(new Date().toISOString().split("T")[0])
    }
  }, [isActive])

  const handleStartDateChange = (date: string) => {
    setStartDate(date)
    onDateRangeChange({
      from: new Date(date),
      to: new Date(endDate),
    })
  }

  const handleEndDateChange = (date: string) => {
    setEndDate(date)
    onDateRangeChange({
      from: new Date(startDate),
      to: new Date(date),
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <DateSelect value={startDate} onChange={handleStartDateChange} label="从" />
      <DateSelect value={endDate} onChange={handleEndDateChange} label="至" />
      <Button onClick={onReset} variant="outline">
        重置筛选
      </Button>
    </div>
  )
}

