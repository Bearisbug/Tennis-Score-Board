"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { DateRange } from "react-day-picker"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

import MatchList from "@/components/match-list"
import DateRangePicker from "@/components/date-range-picker"
import AddMatchDialog from "@/components/add-match-dialog"

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isDateFilterActive, setIsDateFilterActive] = useState(false)

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    setIsDateFilterActive(!!range)
  }

  const handleResetDateFilter = () => {
    setDateRange(undefined)
    setIsDateFilterActive(false)
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 max-w-4xl"
    >
      <motion.h1 initial={{ y: -20 }} animate={{ y: 0 }} className="text-3xl font-bold mb-6 text-center">
        网球比赛管理系统
      </motion.h1>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          onReset={handleResetDateFilter}
          isActive={isDateFilterActive}
        />
        <AddMatchDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加比赛
          </Button>
        </AddMatchDialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 w-full justify-center">
          <TabsTrigger value="all">全部比赛</TabsTrigger>
          <TabsTrigger value="upcoming">未进行</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <MatchList filter="all" dateRange={isDateFilterActive ? dateRange : undefined} />
        </TabsContent>
        <TabsContent value="upcoming">
          <MatchList filter="upcoming" dateRange={isDateFilterActive ? dateRange : undefined} />
        </TabsContent>
        <TabsContent value="completed">
          <MatchList filter="completed" dateRange={isDateFilterActive ? dateRange : undefined} />
        </TabsContent>
      </Tabs>
    </motion.main>
  )
}

