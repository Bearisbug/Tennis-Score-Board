"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"

import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

// 定义比赛类型，包含参赛选手、赛制、是否使用占先以及比赛状态
type Match = {
  id: string
  player1: string
  player2: string
  format: "best-of-3" | "best-of-5"
  useAD: boolean
  status: "upcoming" | "ongoing" | "completed"
}

// 定义记分状态，包括各盘的局分、当前局得分、当前盘索引、占先状态以及最后一盘是否完成的标记
type Score = {
  sets: number[][]         // 每一盘的局分，格式为 [player1局数, player2局数]
  currentGame: [number, number]  // 当前局得分，数字 0~3 分别对应 "0", "15", "30", "40"
  currentSet: number       // 当前进行的盘索引
  advantage: null | "player1" | "player2"  // 当前是否有占先
  finalSetCompleted: boolean  // 标记最后一盘是否完成
}

const scoreMap = ["0", "15", "30", "40", "A"]

export default function MatchPage({ params }: { params: { id: string } }) {
  // 1. 定义状态：比赛信息(match) 和记分状态(score)
  const [match, setMatch] = useState<Match | null>(null)
  const [score, setScore] = useState<Score>({
    sets: [],
    currentGame: [0, 0],
    currentSet: 0,
    advantage: null,
    finalSetCompleted: false,
  })

  // 2. 拉取比赛信息及记分状态
  useEffect(() => {
    const fetchMatch = async () => {
      // 从数据库中获取指定 id 的比赛记录
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

      // 若数据库中存在记分状态则直接使用，否则初始化默认记分状态
      setMatch(data)
      setScore(
        data.score_state || {
          sets: [[0, 0]],
          currentGame: [0, 0],
          currentSet: 0,
          advantage: null,
          finalSetCompleted: false,
        },
      )
    }

    fetchMatch()
  }, [params.id])

  // 3. 更新记分函数：每次点击加分或减分按钮时调用
  const updateScore = async (player: "player1" | "player2", increment: boolean) => {
    if (!match || !score) return

    // 通过 player 参数确定当前操作选手的索引（0 表示左侧，1 表示右侧）
    const playerIndex = player === "player1" ? 0 : 1
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0

    // 根据赛制确定最大盘数（例如 best-of-3 共有 3 盘，best-of-5 共有 5 盘）
    const maxSetCount = match.format === "best-of-3" ? 3 : 5

    // 深拷贝一份当前记分状态，避免直接修改 state
    const newScore: Score = JSON.parse(JSON.stringify(score))
    // 复制比赛信息，便于后续修改比赛状态
    let updatedMatch: Match = { ...match }

    // 保证 currentSet 的索引不超过已有盘数（防止读取 undefined）
    if (newScore.currentSet >= newScore.sets.length) {
      newScore.currentSet = newScore.sets.length - 1
    }

    // 4. 加分逻辑
    if (increment) {
      // 如果当前局得分小于 40（对应数字小于 3），直接加分
      if (newScore.currentGame[playerIndex] < 3) {
        newScore.currentGame[playerIndex]++
      } else {
        // 已达到 40 分，进入决胜局逻辑
        if (match.useAD) {
          // 若采用占先规则
          if (newScore.currentGame[otherPlayerIndex] === 3) {
            // 双方均为 40 分（deuce）
            if (newScore.advantage === player) {
              // 如果当前选手已占先，再得一分则赢下该局：加一局分，并重置当前局得分和占先状态
              if (newScore.sets[newScore.currentSet][playerIndex] < 5) {
                newScore.sets[newScore.currentSet][playerIndex]++
              }
              newScore.currentGame = [0, 0]
              newScore.advantage = null
            } else if (newScore.advantage === null) {
              // 若无人占先，则当前选手获得占先
              newScore.advantage = player
            } else {
              // 对方占先时，本次得分取消对方占先，回到 deuce 状态
              newScore.advantage = null
            }
          } else {
            // 如果对手未满 40，直接赢下该局
            if (newScore.sets[newScore.currentSet][playerIndex] < 5) {
              newScore.sets[newScore.currentSet][playerIndex]++
            }
            newScore.currentGame = [0, 0]
            newScore.advantage = null
          }
        } else {
          // 不使用占先规则，直接赢下该局
          if (newScore.sets[newScore.currentSet][playerIndex] < 5) {
            newScore.sets[newScore.currentSet][playerIndex]++
          }
          newScore.currentGame = [0, 0]
        }
      }
    } else {
      // 5. 减分逻辑（退分操作）
      if (newScore.currentGame[playerIndex] > 0) {
        // 当前局分大于 0 时，直接减去一分
        newScore.currentGame[playerIndex]--
      } else {
        // 若当前局分已为 0，则尝试退局：若该盘已有局分，则退掉一局，并将当前局分设为 40，同时设置占先（仅作为简单示例）
        if (newScore.sets[newScore.currentSet][playerIndex] > 0) {
          newScore.sets[newScore.currentSet][playerIndex]--
          newScore.currentGame[playerIndex] = 3 // 40 分
          if (match.useAD) {
            newScore.advantage = player
          }
        }
      }
    }

    // 6. 检查当前盘是否满足结束条件：
    //    当某选手局分达到 5 且领先对手至少 2 局时，认为该盘结束
    const currentSetScore = newScore.sets[newScore.currentSet]
    if (
      currentSetScore[playerIndex] >= 5 &&
      currentSetScore[playerIndex] - currentSetScore[otherPlayerIndex] >= 2
    ) {
      // 当前盘结束
      if (newScore.currentSet < maxSetCount - 1) {
        // 若当前盘不是最后一盘，则自动切换到下一盘并新增一盘的局分记录
        newScore.currentSet++
        newScore.sets.push([0, 0])
      } else {
        // 已经是最后一盘：标记最后一盘完成，并更新比赛状态为 "completed"
        newScore.finalSetCompleted = true
        updatedMatch.status = "completed"
      }
    } else {
      // 若当前盘为最后一盘但未满足结束条件，清除完成标记
      if (newScore.currentSet === maxSetCount - 1) {
        newScore.finalSetCompleted = false
      }
    }

    // 7. 更新本地记分状态和比赛状态
    setScore(newScore)
    setMatch(updatedMatch)

    // 8. 同步更新到数据库：同时更新记分状态和比赛状态（match.status）
    const { error } = await supabase
      .from("matches")
      .update({
        score_state: newScore,
        status: updatedMatch.status,
      })
      .eq("id", updatedMatch.id)
    if (error) {
      console.error("Error updating score:", error)
    } else {
      console.log("Score updated in DB")
    }
  }

  // 若比赛信息或记分状态还未加载，则显示加载提示
  if (!match || !score) {
    return (
      <div className="flex items-center justify-center p-4 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
      </div>
    )
  }

  // 9. 根据赛制生成总盘数，并为每盘生成圆点
  //    圆点颜色逻辑：
  //    - 对于已完成的盘（非当前进行盘或最后一盘且已完成），根据局分判断胜者：
  //        左侧胜的圆点显示为绿色，右侧胜的显示为红色；
  //    - 未完成的盘显示为灰色
  const totalSets = match.format === "best-of-3" ? 3 : 5
  const renderDots = Array.from({ length: totalSets }, (_, i) => {
    let dotColor = "bg-gray-300"
    if (i < score.sets.length) {
      // 对于已存在的盘：
      // 若不是当前进行的盘（i < score.sets.length - 1），或者是最后一盘且已完成，
      // 则判断该盘的局分来确定颜色
      if (i < score.sets.length - 1 || (i === score.sets.length - 1 && score.finalSetCompleted)) {
        const setScore = score.sets[i]
        if (setScore[0] > setScore[1]) {
          dotColor = "bg-green-500" // 左侧选手赢该盘
        } else if (setScore[1] > setScore[0]) {
          dotColor = "bg-red-500"   // 右侧选手赢该盘
        }
      }
    }
    return <div key={i} className={`w-4 h-4 rounded-full mx-1 ${dotColor}`} />
  })

  // 10. 当前显示盘索引：若 currentSet 超出则取最后一盘
  const displaySetIndex =
    score.currentSet < score.sets.length ? score.currentSet : score.sets.length - 1

  return (
    <div className="container mx-auto p-4 flex flex-col h-screen">
      {/* 显示比赛双方名称 */}
      <h1 className="text-3xl font-bold mb-6">
        {match.player1} vs {match.player2}
      </h1>

      {/* 渲染各盘圆点 */}
      <div className="flex justify-center mb-4">
        {renderDots}
      </div>

      {/* 11. 渲染当前局（game）得分 */}
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

      {/* 12. 渲染当前盘的局分（sets） */}
      <Card className="mb-4">
        <CardContent className="flex justify-between items-center p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${score.sets[displaySetIndex][0]}-${score.sets[displaySetIndex][1]}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="flex justify-between items-center w-full"
            >
              {/* 显示局分时限制最大显示为 5 */}
              <div className="text-6xl font-bold">
                {Math.min(score.sets[displaySetIndex][0], 5)}
              </div>
              <div className="text-4xl font-semibold">-</div>
              <div className="text-6xl font-bold">
                {Math.min(score.sets[displaySetIndex][1], 5)}
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* 13. 渲染记分按钮（无论比赛是否结束，均允许修改分数） */}
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

      {/* 若比赛状态为 "completed"，显示比赛结束提示 */}
      {match.status === "completed" && (
        <div className="text-center text-2xl font-bold mt-4">比赛已结束</div>
      )}
    </div>
  )
}
