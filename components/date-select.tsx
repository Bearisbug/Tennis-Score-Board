"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateSelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function DateSelect({ value, onChange, label }: DateSelectProps) {
  // 生成年份选项（当前年份和后两年）
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear + 1, currentYear + 2]

  // 生成月份选项
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // 生成日期选项（默认31天，实际使用时可以根据年月调整）
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  const [year, month, day] = value ? value.split("-").map(Number) : [currentYear, 1, 1]

  const handleYearChange = (newYear: string) => {
    onChange(`${newYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`)
  }

  const handleMonthChange = (newMonth: string) => {
    onChange(`${year}-${newMonth.padStart(2, "0")}-${day.toString().padStart(2, "0")}`)
  }

  const handleDayChange = (newDay: string) => {
    onChange(`${year}-${month.toString().padStart(2, "0")}-${newDay.padStart(2, "0")}`)
  }

  return (
    <div className="flex gap-2 items-center">
      {label && <span className="text-sm">{label}</span>}
      <Select value={year.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {month}月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={day.toString()} onValueChange={handleDayChange}>
        <SelectTrigger className="w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day} value={day.toString()}>
              {day}日
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

