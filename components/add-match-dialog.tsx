"use client";

import type React from "react";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateSelect } from "./date-select";

export default function AddMatchDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [useAD, setUseAD] = useState(true);
  const [format, setFormat] = useState("best-of-3");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const initialScoreState = {
      sets: [[0, 0]],
      currentGame: [0, 0],
      currentSet: 0,
      advantage: null,
    };

    const { data, error } = await supabase
      .from("matches")
      .insert({
        player1,
        player2,
        use_ad: useAD,
        format,
        match_date: date,
        status: "upcoming",
        score_state: initialScoreState,
      })
      .select();

    if (error) {
      console.error("Error inserting match:", error);
      return;
    }

    console.log("Match inserted:", data);

    setOpen(false);
    setPlayer1("");
    setPlayer2("");
    setUseAD(true);
    setFormat("best-of-3");
    setDate(new Date().toISOString().split("T")[0]);
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加新比赛</DialogTitle>
          <DialogDescription>请输入新网球比赛的详细信息。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="player1" className="text-right">
                选手1
              </Label>
              <Input
                id="player1"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="player2" className="text-right">
                选手2
              </Label>
              <Input
                id="player2"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="useAD" className="text-right">
                使用AD
              </Label>
              <Checkbox
                id="useAD"
                checked={useAD}
                onCheckedChange={(checked) => setUseAD(!!checked)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="format" className="text-right">
                赛制
              </Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best-of-3">三盘两胜</SelectItem>
                  <SelectItem value="best-of-5">五盘三胜</SelectItem>
                  <SelectItem value="one-set-4">一盘制（四局胜）</SelectItem>
                  <SelectItem value="one-set-6">一盘制（六局胜）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                日期
              </Label>
              <div className="col-span-3">
                <DateSelect value={date} onChange={setDate} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">添加比赛</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
