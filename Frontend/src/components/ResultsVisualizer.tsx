/**
 * @fileoverview ResultsVisualizer Component - Game results display and winner announcement
 *
 * PURPOSE:
 * Displays comprehensive game results including mathematical calculations,
 * winner announcement, and prize withdrawal functionality.
 *
 * KEY FEATURES:
 * - Mathematical breakdown (submissions, average, 2/3 calculation)
 * - Winner announcement with address formatting
 * - Prize withdrawal for winners
 * - Play again functionality for new games
 * - Responsive grid layout for result metrics
 */

// src/components/ResultsVisualizer.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, BarChart3, RefreshCw, Coins } from "lucide-react";
import { useEthereum } from "@/contexts/EthereumContext";

interface ResultsVisualizerProps {
  submissions?: number[];
  winningNumber?: number;
  winner?: string;
  prizeAmount?: string;
  onPlayAgain?: () => void;
}

const ResultsVisualizer: React.FC<ResultsVisualizerProps> = ({
  submissions: propSubmissions,
  winningNumber: propWinningNumber,
  winner: propWinner,
  prizeAmount: propPrizeAmount,
  onPlayAgain,
}) => {
  const {
    submissions: contextSubmissions,
    winningNumber: contextWinningNumber,
    winner: contextWinner,
    prizeAmount: contextPrizeAmount,
    account,
    currentGameContract,
    playerCount,
  } = useEthereum();

  const submissions = propSubmissions ?? contextSubmissions ?? [];
  const winningNumber = propWinningNumber ?? contextWinningNumber ?? 0;
  const winner = propWinner ?? contextWinner ?? "";
  const prizeAmount = propPrizeAmount ?? contextPrizeAmount ?? "0 ETH";
  const [hasWithdrawn, setHasWithdrawn] = useState(false);

  // Derived values
  const average =
    submissions.length > 0
      ? submissions.reduce((a, b) => a + b, 0) / submissions.length
      : 0;
  const twoThirdsAverage = Math.round((average * 2) / 3);
  const closestSubmission = submissions.reduce(
    (prev, curr) =>
      Math.abs(curr - twoThirdsAverage) < Math.abs(prev - twoThirdsAverage)
        ? curr
        : prev,
    submissions[0] || 0
  );

  useEffect(() => {
    // Placeholder: animations skipped
  }, []);

  const formatAddress = (addr: string) =>
    addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const withdrawPrize = async () => {
    if (!currentGameContract) return;
    try {
      const btn = document.getElementById("withdraw-prize-button");
      if (btn) {
        btn.textContent = "Processing...";
        btn.setAttribute("disabled", "");
      }
      const tx = await currentGameContract.withdraw();
      await tx.wait();
      alert("Prize withdrawn successfully!");
      setHasWithdrawn(true); // ✅ mark as withdrawn
    } catch (e) {
      console.error(e);
      alert("Failed to withdraw prize");
      const btn = document.getElementById("withdraw-prize-button");
      if (btn) {
        btn.textContent = "Withdraw Prize";
        btn.removeAttribute("disabled");
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Calculation */}
      <Card className="w-full max-w-2xl bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-8">
        <CardContent>
          <h3 className="text-xl font-bold text-cyan-300 flex items-center mb-4">
            <BarChart3 className="mr-2 h-5 w-5" /> Results Calculation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Total Submissions</p>
              <p className="text-2xl font-bold text-white">
                {submissions.length}
              </p>
            </div>
            <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Average</p>
              <p className="text-2xl font-bold text-white">
                {average.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">2/3 of Average</p>
              <p className="text-2xl font-bold text-green-400">
                {twoThirdsAverage}
              </p>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-300 bg-blue-900/30 p-3 rounded-lg">
            <span className="text-lg font-bold text-blue-300">
              Winning Number: {winningNumber}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Winner */}
      <div className="w-full max-w-2xl">
        <Card className="bg-gradient-to-r from-yellow-900/70 to-amber-900/70 border-yellow-600 overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="flex flex-col items-center text-center z-10 relative">
              <Trophy className="h-16 w-16 text-yellow-300 mb-2" />
              <h2 className="text-2xl font-bold text-white mb-1">
                Winner Announcement
              </h2>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                <h3 className="text-xl font-bold text-yellow-300">
                  {formatAddress(winner)}
                </h3>
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </div>
              <div className="bg-black/30 rounded-lg p-4 mb-4 w-full max-w-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-yellow-200/70 text-sm">
                      Closest Submission
                    </p>
                    <p className="text-xl font-bold text-white">
                      {closestSubmission}
                    </p>
                  </div>
                  <div>
                    <p className="text-yellow-200/70 text-sm">Prize Amount</p>
                    <p className="text-xl font-bold text-white">
                      {prizeAmount}
                    </p>
                  </div>
                </div>
              </div>
              {winner.toLowerCase() === account?.toLowerCase() ? (
                hasWithdrawn ? (
                  <Button
                    onClick={onPlayAgain}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white flex items-center gap-2"
                  >
                    Play Again <RefreshCw className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    id="withdraw-prize-button"
                    onClick={withdrawPrize}
                    className="bg-green-600 hover:bg-green-500 text-white flex items-center gap-2"
                  >
                    Withdraw Prize <Coins className="h-4 w-4" />
                  </Button>
                )
              ) : (
                <Button
                  onClick={onPlayAgain}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white flex items-center gap-2"
                >
                  Play Again <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsVisualizer;
