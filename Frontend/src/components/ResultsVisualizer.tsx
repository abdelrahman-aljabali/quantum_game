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
 * - Play again functionality for new games (via resetGameUI)
 * - Responsive grid layout for result metrics
 */

// src/components/ResultsVisualizer.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, BarChart3, RefreshCw, Coins } from "lucide-react";
import { useEthereum } from "@/contexts/EthereumContext";

// ─── ➀ The props interface: no onPlayAgain here, just exactly what you need ─────────────────
interface ResultsVisualizerProps {
  submissions?: number[];
  winningNumber?: number;
  winner?: string;
  prizeAmount?: string;
}

const ResultsVisualizer: React.FC<ResultsVisualizerProps> = ({
  submissions: propSubmissions,
  winningNumber: propWinningNumber,
  winner: propWinner,
  prizeAmount: propPrizeAmount,
}) => {
  // ─── ➁ Pull everything you need from context here, *inside* the component ─────────────────────
  const {
    submissions: contextSubmissions,
    winningNumber: contextWinningNumber,
    winner: contextWinner,
    prizeAmount: contextPrizeAmount,
    account,
    currentGameContract,
    gameFactoryContract,
    resetGameUI, // ← now this is valid, because it’s inside the component
    refreshGameState,
  } = useEthereum();

  // ─── ➂ Merge “prop vs. context” values (exactly how you had it) ─────────────────────────────
  const submissions = propSubmissions ?? contextSubmissions ?? [];
  const winningNumber = propWinningNumber ?? contextWinningNumber ?? 0;
  const winner = propWinner ?? contextWinner ?? "";
  const prizeAmount = propPrizeAmount ?? contextPrizeAmount ?? "0 ETH";

  // Track whether this address has already withdrawn
  const [hasWithdrawn, setHasWithdrawn] = useState(false);

  // ─── ➃ Compute average, two-thirds, closest submission ─────────────────────────────────────
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
    // (Optional) any animations or side-effects you want
  }, []);

  // ─── ➄ Helper to shorten addresses for display ──────────────────────────────────────────────
  const formatAddress = (addr: string) =>
    addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  // ─── ➅ Prize-withdrawal handler (unchanged from before) ─────────────────────────────────────
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
      setHasWithdrawn(true);
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

  const handlePlayAgain = async () => {
    if (!gameFactoryContract) {
      alert("Factory contract not loaded. Cannot create a new game.");
      return;
    }

    try {
      // ➀ Ask the factory to deploy a fresh TwoThirdsAverageGame:
      const tx = await gameFactoryContract.createGame();
      console.log("⏳ Waiting for createGame() tx to be mined…");
      await tx.wait();
      console.log("✅ New game deployed by factory.");

      // ➁ Once mined, clear out the old game UI state:
      await resetGameUI();
      console.log(
        "🔁 Front-end state has been reset and is now pointing at the new game."
      );

      // ➂ Immediately re-fetch the new game’s state so React flips back into “Waiting”:
      await refreshGameState();
      console.log(
        "🔄 Fetched new game state. UI should now show the join‐game screen."
      );
    } catch (e) {
      console.error("Failed to create new game:", e);
      alert("Could not start a new game. Check console for details.");
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* ───────────────────────────────────────────────────────────────────────
          Results Calculation Card
      ─────────────────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────────────────
          Winner Announcement Card
      ─────────────────────────────────────────────────────────────────────── */}
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

              {/* ─── If *this* account is the winner ───────────────────────────────── */}
              {winner.toLowerCase() === account?.toLowerCase() ? (
                hasWithdrawn ? (
                  <Button
                    onClick={handlePlayAgain}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white flex items-center gap-2"
                  >
                    Create a New Game & Play Again{" "}
                    <RefreshCw className="h-4 w-4" />
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
                /* ─── If not the winner, still offer “Play Again” ─────────────────── */
                <Button
                  onClick={handlePlayAgain}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white flex items-center gap-2"
                >
                  Create a New Game & Play Again{" "}
                  <RefreshCw className="h-4 w-4" />
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
