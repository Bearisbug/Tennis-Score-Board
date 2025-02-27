"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"

import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

type Match = {
  id: string
  player1: string
  player2: string
  format: "best-of-3" | "best-of-5"
  use_ad: boolean
  score_state: Score
}

type Score = {
  sets: number[][]
  currentGame: [number, number]
  currentSet: number
  advantage: null | "player1" | "player2"
}

const scoreMap = ["0", "15", "30", "40", "A"]

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  // 1. 拉取比赛信息
  useEffect(() => {
    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) {
        console.error("Error fetching match:", error)
        return
      }

      if (!data) return

      // 把数据库里取到的记录转为更明确的类型
      const typedMatch = {
        id: data.id,
        player1: data.player1,
        player2: data.player2,
        format: data.format,
        use_ad: data.use_ad,
        score_state: data.score_state,
      } as Match

      setMatch(typedMatch)
      setScore(typedMatch.score_state)
    }

    fetchMatch()
  }, [params.id])

  // 2. 每次加减分后，更新 state + 数据库
  const updateScore = async (player: "player1" | "player2", increment: boolean) => {
    if (!match || !score) return

    const playerIndex = player === "player1" ? 0 : 1
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0

    // 拷贝一份新的 score
    const newScore: Score = JSON.parse(JSON.stringify(score))

    if (increment) {
      // +1 逻辑
      if (newScore.currentGame[playerIndex] < 3) {
        // 0->1->2->3 (40)
        newScore.currentGame[playerIndex]++
      } else {
        // 已经是 40
        if (match.use_ad) {
          // 有占先
          if (newScore.currentGame[otherPlayerIndex] === 3) {
            // 双方都是40
            if (newScore.advantage === player) {
              // 当前已经占先，再得1分 -> 赢下game
              newScore.sets[newScore.currentSet][playerIndex]++
              newScore.currentGame = [0, 0]
              newScore.advantage = null
            } else if (newScore.advantage === null) {
              // 之前没有占先，则现在 player 占先
              newScore.advantage = player
            } else {
              // 对方占先，再来一次分 -> 取消占先，回到 deuce
              newScore.advantage = null
            }
          } else {
            // 对手没到 40(3)
            // 直接赢下game
            newScore.sets[newScore.currentSet][playerIndex]++
            newScore.currentGame = [0, 0]
            newScore.advantage = null
          }
        } else {
          // 不使用占先 -> 直接赢下 game
          newScore.sets[newScore.currentSet][playerIndex]++
          newScore.currentGame = [0, 0]
        }
      }
    } else {
      // -1 逻辑（退分）
      if (newScore.currentGame[playerIndex] > 0) {
        newScore.currentGame[playerIndex]--
      } else {
        // 如果本来是0分，再往回退
        // 这里逻辑怎么定义，就看你自己了
        // 简单示例：如果某方 game 分=0，但该盘里得局数>0，就减一局然后把当前game分改为40
        if (newScore.sets[newScore.currentSet][playerIndex] > 0) {
          newScore.sets[newScore.currentSet][playerIndex]--
          newScore.currentGame[playerIndex] = 3 // 回到40
          newScore.advantage = player
        }
      }
    }

    // 检查是否有人赢下当前盘
    // 例如：一方局数达到6，且比对手多2
    const currentSetScore = newScore.sets[newScore.currentSet]
    if (
      currentSetScore[playerIndex] >= 6 &&
      currentSetScore[playerIndex] - currentSetScore[otherPlayerIndex] >= 2
    ) {
      // 该盘结束
      newScore.currentSet++
      if (newScore.currentSet < (match.format === "best-of-3" ? 3 : 5)) {
        newScore.sets.push([0, 0]) // 新增下一盘
      } else {
        // 如果已经打完最多盘数，可以判断整场结束
        // 这里可以把 match.status 改为 "completed"
      }
    }

    // 3. 更新本地状态
    setScore(newScore)

    // 4. 同步更新到数据库(更新 matches 表的 score_state)
    const { error } = await supabase
      .from("matches")
      .update({
        score_state: newScore,
      })
      .eq("id", match.id)

    if (error) {
      console.error("Error updating score:", error)
    } else {
      console.log("Score updated in DB")
    }
  }

  if (!match || !score) {
    return (
      <div className="flex items-center justify-center p-4 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-6">
        {match.player1} vs {match.player2}
      </h1>

      {/* 赛制进度，可用小圆点标示当前盘 */}
      <div className="flex justify-center mb-4">
        {Array.from({ length: match.format === "best-of-3" ? 3 : 5 }, (_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full mx-1 ${
              i < score.currentSet ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* 显示当前局（game）比分 */}
      <Card className="mb-4 flex-grow flex items-center justify-center">
        <CardContent className="w-full h-full flex justify-center items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${score.currentGame[0]}-${score.currentGame[1]}-${score.advantage ?? "none"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex justify-between items-center w-full"
            >
              <div className="text-9xl font-bold w-2/5 text-center">
                {score.advantage === "player1" ? "A" : scoreMap[score.currentGame[0]]}
              </div>
              <div className="text-6xl font-semibold">-</div>
              <div className="text-9xl font-bold w-2/5 text-center">
                {score.advantage === "player2" ? "A" : scoreMap[score.currentGame[1]]}
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* 显示当前盘的局分 (sets) */}
      <Card className="mb-4">
        <CardContent className="flex justify-between items-center p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${score.sets[score.currentSet][0]}-${score.sets[score.currentSet][1]}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="flex justify-between items-center w-full"
            >
              <div className="text-6xl font-bold">{score.sets[score.currentSet][0]}</div>
              <div className="text-4xl font-semibold">-</div>
              <div className="text-6xl font-bold">{score.sets[score.currentSet][1]}</div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* 记分按钮 */}
      <div className="flex justify-between">
        <div>
          <Button onClick={() => updateScore("player1", true)} className="mr-2">
            +1 {match.player1}
          </Button>
          <Button onClick={() => updateScore("player1", false)} variant="outline">
            -1 {match.player1}
          </Button>
        </div>
        <div>
          <Button onClick={() => updateScore("player2", true)} className="mr-2">
            +1 {match.player2}
          </Button>
          <Button onClick={() => updateScore("player2", false)} variant="outline">
            -1 {match.player2}
          </Button>
        </div>
      </div>
    </div>
  )
}
