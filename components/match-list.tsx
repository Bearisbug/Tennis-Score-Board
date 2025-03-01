"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import type { DateRange } from "react-day-picker"
import { Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"

type Match = {
  id: string
  player1: string
  player2: string
  match_date: string
  status: "upcoming" | "completed"
  format?: string
  use_ad?: boolean
  score_state?: any
}

export default function MatchList({
  filter,
  dateRange,
}: {
  filter: "all" | "upcoming" | "completed"
  dateRange: DateRange | undefined
}) {
  const [matches, setMatches] = useState<Match[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const matchesPerPage = 5
  const { toast } = useToast()

  const fetchMatches = async () => {
    const { data, error } = await supabase.from("matches").select("*")

    if (error) {
      console.error("Error fetching matches:", error)
      return
    }
    if (!data) return

    let filteredMatches = data as Match[]

    if (filter !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.status === filter)
    }

    if (dateRange?.from && dateRange?.to) {
      filteredMatches = filteredMatches.filter((match) => {
        const matchDate = new Date(match.match_date)
        return matchDate >= dateRange.from! && matchDate <= dateRange.to!
      })
    }

    setMatches(filteredMatches)
    setCurrentPage(1)
  }

  useEffect(() => {
    fetchMatches()
  }, [filter, dateRange]) // Added dependencies for filter and dateRange

  const deleteMatch = async (id: string, e: React.MouseEvent) => {
    e.preventDefault() // 防止链接跳转
    e.stopPropagation() // 防止事件冒泡

    const { error } = await supabase.from("matches").delete().eq("id", id)

    if (error) {
      console.error("Error deleting match:", error)
      toast({
        title: "删除失败",
        description: "无法删除比赛，请稍后重试。",
        variant: "destructive",
      })
    } else {
      toast({
        title: "删除成功",
        description: "比赛已成功删除。",
      })
      fetchMatches() // 重新获取比赛列表
    }
  }

  const indexOfLastMatch = currentPage * matchesPerPage
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage
  const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch)

  const totalPages = Math.ceil(matches.length / matchesPerPage)

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <div>
      {currentMatches.map((match, index) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center mb-4"
        >
          <Link href={`/match/${match.id}`} className="flex-grow">
          <Card key={match.id} className="mb-4">
          <CardContent className="p-6 flex items-center justify-between relative">
            <div className="text-lg font-semibold w-1/3 text-left">{match.player1}</div>
            <div className="flex items-center justify-center w-1/3">
              {match.score_state && match.score_state.sets.length > 0 && (
                <div className="flex flex-col items-center mr-2">
                  <span className="text-xl font-bold">{match.score_state.sets.map((set: any[]) => set[0]).join("-")}</span>
                  {match.status === "completed" && match.score_state.currentGame[0] > 0 && (
                    <span className="text-xs text-gray-500">
                      {["0", "15", "30", "40"][match.score_state.currentGame[0]]}
                      {match.score_state.advantage === "player1" ? "A" : ""}
                    </span>
                  )}
                </div>
              )}
              <div className="text-xl font-bold mx-2">VS</div>
              {match.score_state && match.score_state.sets.length > 0 && (
                <div className="flex flex-col items-center ml-2">
                  <span className="text-xl font-bold">{match.score_state.sets.map((set: any[]) => set[1]).join("-")}</span>
                  {match.status === "completed" && match.score_state.currentGame[1] > 0 && (
                    <span className="text-xs text-gray-500">
                      {["0", "15", "30", "40"][match.score_state.currentGame[1]]}
                      {match.score_state.advantage === "player2" ? "A" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-lg font-semibold w-1/3 text-right">{match.player2}</div>
            <div className="absolute bottom-2 right-4 text-gray-500 text-xs">{match.match_date}</div>
          </CardContent>
        </Card>
          </Link>
          <Button variant="ghost" size="icon" className="ml-2" onClick={(e) => deleteMatch(match.id, e)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </motion.div>
      ))}
      <div className="flex justify-center mt-4">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <Button
            key={pageNum}
            onClick={() => paginate(pageNum)}
            variant={currentPage === pageNum ? "default" : "outline"}
            className="mx-1"
          >
            {pageNum}
          </Button>
        ))}
      </div>
    </div>
  )
}

