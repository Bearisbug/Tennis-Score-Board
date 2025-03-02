"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import type { DateRange } from "react-day-picker";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

type Match = {
  id: string;
  player1: string;
  player2: string;
  match_date: string;
  status: "upcoming" | "completed";
  format?: string;
  use_ad?: boolean;
  score_state?: any;
};

export default function MatchList({
  filter,
  dateRange,
}: {
  filter: "all" | "upcoming" | "completed";
  dateRange: DateRange | undefined;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 5;
  const { toast } = useToast();
  const formatMap: { [key: string]: string } = {
    "best-of-3": "三盘两胜",
    "best-of-5": "五盘三胜",
    "one-set-4": "一盘制（四局胜）",
    "one-set-6": "一盘制（六局胜）",
  };
  const fetchMatches = async () => {
    const { data, error } = await supabase.from("matches").select("*");

    if (error) {
      console.error("Error fetching matches:", error);
      return;
    }
    if (!data) return;

    let filteredMatches = data as Match[];

    if (filter !== "all") {
      filteredMatches = filteredMatches.filter(
        (match) => match.status === filter
      );
    }

    if (dateRange?.from && dateRange?.to) {
      filteredMatches = filteredMatches.filter((match) => {
        const matchDate = new Date(match.match_date);
        return matchDate >= dateRange.from! && matchDate <= dateRange.to!;
      });
    }

    setMatches(filteredMatches);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchMatches();
  }, [filter, dateRange]);

  const deleteMatch = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { error } = await supabase.from("matches").delete().eq("id", id);

    if (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "删除失败",
        description: "无法删除比赛，请稍后重试。",
        variant: "destructive",
      });
    } else {
      toast({
        title: "删除成功",
        description: "比赛已成功删除。",
      });
      fetchMatches();
    }
  };

  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch);

  const totalPages = Math.ceil(matches.length / matchesPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div>
      {currentMatches.length > 0 ? (
        currentMatches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-center mb-4"
          >
            <Link href={`/match/${match.id}`} className="flex-grow">
              <Card className="mb-0 overflow-hidden border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="bg-[#eaeaee] px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {match.format
                          ? formatMap[match.format] || match.format
                          : "比赛"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">
                        {match.status === "completed" ? "已结束" : "即将开始"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`px-4 py-3 flex items-center justify-between ${
                        match.status === "completed" &&
                        match.score_state?.sets &&
                        match.score_state.sets.reduce(
                          (acc: any, set: any[]) => acc + (set[0] > set[1] ? 1 : 0),
                          0
                        ) >
                          match.score_state.sets.reduce(
                            (acc: any, set: any[]) => acc + (set[1] > set[0] ? 1 : 0),
                            0
                          )
                          ? "bg-white text-black"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 w-1/2">
                        <span className="font-medium">{match.player1}</span>
                      </div>
                      <div className="flex items-center justify-end gap-4 w-1/2">
                        {match.score_state?.sets?.map(
                          (set: number[], index: number) => (
                            <span
                              key={index}
                              className="text-xl font-bold w-6 text-center"
                            >
                              {set[0]}
                            </span>
                          )
                        )}
                        {!match.score_state?.sets?.length && (
                          <span className="text-xl font-bold w-6 text-center">
                            -
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`px-4 py-3 flex items-center justify-between ${
                        match.status === "completed" &&
                        match.score_state?.sets &&
                        match.score_state.sets.reduce(
                          (acc: any, set: any[]) => acc + (set[1] > set[0] ? 1 : 0),
                          0
                        ) >
                          match.score_state.sets.reduce(
                            (acc: any, set: any[]) => acc + (set[0] > set[1] ? 1 : 0),
                            0
                          )
                          ? "bg-white text-black"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 w-1/2">
                        <span className="font-medium">{match.player2}</span>
                      </div>
                      <div className="flex items-center justify-end gap-4 w-1/2">
                        {match.score_state?.sets?.map(
                          (set: number[], index: number) => (
                            <span
                              key={index}
                              className="text-xl font-bold w-6 text-center"
                            >
                              {set[1]}
                            </span>
                          )
                        )}
                        {!match.score_state?.sets?.length && (
                          <span className="text-xl font-bold w-6 text-center">
                            -
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-1 text-xs text-gray-500">
                    {new Date(match.match_date).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2"
              onClick={(e) => deleteMatch(match.id, e)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </motion.div>
        ))
      ) : (
        <p>No matches found.</p>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Button
                key={pageNum}
                onClick={() => paginate(pageNum)}
                variant={currentPage === pageNum ? "default" : "outline"}
                className="mx-1"
              >
                {pageNum}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
