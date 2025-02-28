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
  format: "best-of-3" | "best-of-5" | "one-set-4" | "one-set-6"
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
  /**
   * 新增字段：用于记录每一盘的抢七分数（如果没有触发抢七则为 null）。
   * 例如：tieBreakScores[i] = [p1TieBreakPoints, p2TieBreakPoints]。
   */
  tieBreakScores: (number[] | null)[]
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
    tieBreakScores: [], // 初始化时为空数组
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
      // 同时，确保 tieBreakScores 与 sets 同步
      const newScore: Score = data.score_state || {
        sets: [[0, 0]],
        currentGame: [0, 0],
        currentSet: 0,
        advantage: null,
        finalSetCompleted: false,
        tieBreakScores: [null],
      }

      if (!Array.isArray(newScore.tieBreakScores)) {
        newScore.tieBreakScores = []
      }
      while (newScore.tieBreakScores.length < newScore.sets.length) {
        newScore.tieBreakScores.push(null)
      }

      setMatch(data)
      setScore(newScore)
    }

    fetchMatch()
  }, [params.id])

  // 设定不同赛制的相关参数
  const getMatchParams = (format: string) => {
    let maxSetCount = 3
    let winningGameCount = 6  // 胜盘局数（赢盘时必须达到的局数，不包含 deuce 等特殊处理）
    switch (format) {
      case "best-of-3":
        maxSetCount = 3
        winningGameCount = 6
        break
      case "best-of-5":
        maxSetCount = 5
        winningGameCount = 6
        break
      case "one-set-4":
        maxSetCount = 1
        winningGameCount = 4
        break
      case "one-set-6":
        maxSetCount = 1
        winningGameCount = 6
        break
      default:
        break
    }
    return { maxSetCount, winningGameCount }
  }

  /**
   * 判断是否需要进入抢七：
   * 当盘分 [p1, p2] 达到 6:6 (或 4:4) 时，就应进入抢七。
   */
  const shouldPlayTieBreak = (setScore: number[], winningGameCount: number) => {
    return (
      setScore[0] === winningGameCount &&
      setScore[1] === winningGameCount
    )
  }

  const updateScore = async (player: "player1" | "player2", increment: boolean) => {
    if (!match || !score) return

    // 如果比赛已经结束且是加分操作，则不允许再增加大比分
    if (match.status === "completed" && increment) return

    const playerIndex = player === "player1" ? 0 : 1
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0

    const { maxSetCount, winningGameCount } = getMatchParams(match.format)

    // 深拷贝当前记分状态
    const newScore: Score = JSON.parse(JSON.stringify(score))
    let updatedMatch: Match = { ...match }

    if (newScore.currentSet >= newScore.sets.length) {
      newScore.currentSet = newScore.sets.length - 1
    }

    // 确保 tieBreakScores[newScore.currentSet] 存在
    if (newScore.tieBreakScores[newScore.currentSet] === undefined) {
      newScore.tieBreakScores[newScore.currentSet] = null
    }

    const currentSetScore = newScore.sets[newScore.currentSet]
    const isTieBreak = newScore.tieBreakScores[newScore.currentSet] !== null

    // ---------------- 抢七模式下的加/减分 ----------------
    if (isTieBreak) {
      const tieScore = newScore.tieBreakScores[newScore.currentSet]!
      // 加分
      if (increment) {
        tieScore[playerIndex]++
      } else {
        // 减分
        if (tieScore[playerIndex] > 0) {
          tieScore[playerIndex]--
        }
      }

      // 判断抢七是否结束：一方 >= 7 且比对手多 2 分
      if (
        tieScore[playerIndex] >= 7 &&
        tieScore[playerIndex] - tieScore[otherPlayerIndex] >= 2
      ) {
        // 抢七结束，该盘比分定格为 7:6 或 6:7
        if (playerIndex === 0) {
          currentSetScore[0] = winningGameCount + 1 // 7
          currentSetScore[1] = winningGameCount     // 6
        } else {
          currentSetScore[1] = winningGameCount + 1
          currentSetScore[0] = winningGameCount
        }

        // 结束当前盘
        if (newScore.currentSet < maxSetCount - 1) {
          newScore.currentSet++
          newScore.sets.push([0, 0])
          newScore.tieBreakScores.push(null)
        } else {
          // 已经是最后一盘，标记比赛结束
          newScore.finalSetCompleted = true
          updatedMatch.status = "completed"
        }
      }

      // ---------------- 常规模式下的加/减分 ----------------
    } else {
      // 加分逻辑
      if (increment) {
        // 当前局得分：0-1-2-3 分别对应 "0"、"15"、"30"、"40"
        if (newScore.currentGame[playerIndex] < 3) {
          newScore.currentGame[playerIndex]++
        } else {
          // 已达到40分，进入决胜局逻辑
          if (match.useAD) {
            if (newScore.currentGame[otherPlayerIndex] === 3) {
              // 双方均为40分（deuce状态）
              if (newScore.advantage === player) {
                // 已占先，再得一分，赢下当前局
                newScore.sets[newScore.currentSet][playerIndex]++
                newScore.currentGame = [0, 0]
                newScore.advantage = null
              } else if (newScore.advantage === null) {
                newScore.advantage = player
              } else {
                newScore.advantage = null
              }
            } else {
              // 对手未到40，直接赢下当前局
              newScore.sets[newScore.currentSet][playerIndex]++
              newScore.currentGame = [0, 0]
              newScore.advantage = null
            }
          } else {
            // 不使用占先规则
            newScore.sets[newScore.currentSet][playerIndex]++
            newScore.currentGame = [0, 0]
          }
        }
      } else {
        // 减分逻辑
        if (newScore.currentGame[playerIndex] > 0) {
          newScore.currentGame[playerIndex]--
        } else if (newScore.sets[newScore.currentSet][playerIndex] > 0) {
          newScore.sets[newScore.currentSet][playerIndex]--
          newScore.currentGame[playerIndex] = 3 // 回到40
          if (match.useAD) {
            newScore.advantage = player
          }
        }
      }

      // 检查是否赢下当前局后有无达到“赢盘条件”
      if (
        currentSetScore[playerIndex] >= winningGameCount &&
        currentSetScore[playerIndex] - currentSetScore[otherPlayerIndex] >= 2
      ) {
        // 结束当前盘
        if (newScore.currentSet < maxSetCount - 1) {
          newScore.currentSet++
          newScore.sets.push([0, 0])
          newScore.tieBreakScores.push(null)
        } else {
          // 已经是最后一盘，标记比赛结束
          newScore.finalSetCompleted = true
          updatedMatch.status = "completed"
        }
      } else {
        // 如果没直接赢盘，则判断是否进入抢七
        if (shouldPlayTieBreak(currentSetScore, winningGameCount)) {
          newScore.tieBreakScores[newScore.currentSet] = [0, 0]
          newScore.currentGame = [0, 0]
          newScore.advantage = null
        } else {
          if (newScore.currentSet === maxSetCount - 1) {
            newScore.finalSetCompleted = false
          }
        }
      }
    }

    // 更新本地状态和数据库记录
    setScore(newScore)
    setMatch(updatedMatch)
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
  const totalSets =
    match.format === "best-of-3"
      ? 3
      : match.format === "best-of-5"
      ? 5
      : 1
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
              {/* 显示局分时限制最大显示为 7（因有抢七可能） */}
              <div className="text-6xl font-bold">
                {Math.min(score.sets[displaySetIndex][0], 7)}
              </div>
              <div className="text-4xl font-semibold">-</div>
              <div className="text-6xl font-bold">
                {Math.min(score.sets[displaySetIndex][1], 7)}
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
