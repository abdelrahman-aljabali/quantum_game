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

const ResultsVisualizer = ({
  submissions: propSubmissions,
  winningNumber: propWinningNumber,
  winner: propWinner,
  prizeAmount: propPrizeAmount,
  onPlayAgain = () => console.log("Play again clicked"),
}: ResultsVisualizerProps) => {
  const [showCalculation, setShowCalculation] = useState(true);
  const [showWinner, setShowWinner] = useState(true);
  const [calculationStep, setCalculationStep] = useState(2);
  const [animationComplete, setAnimationComplete] = useState(true);

  // Use Ethereum context
  const {
    submissions: contextSubmissions,
    winningNumber: contextWinningNumber,
    winner: contextWinner,
    prizeAmount: contextPrizeAmount,
    account,
    currentGameContract,
  } = useEthereum();

  // Function to withdraw prize
  const withdrawPrize = async () => {
    if (!currentGameContract) {
      console.error("Game contract not initialized");
      alert("Cannot withdraw prize: Game contract not initialized");
      return;
    }

    try {
      // Show feedback that transaction is processing
      const withdrawButton = document.getElementById("withdraw-prize-button");
      if (withdrawButton) {
        withdrawButton.textContent = "Processing...";
        withdrawButton.disabled = true;
      }

      const tx = await currentGameContract.withdraw();
      console.log("Withdrawal transaction submitted:", tx.hash);

      // Wait for transaction confirmation
      await tx.wait();
      console.log("Withdrawal transaction confirmed");

      alert("Prize withdrawn successfully!");

      // Refresh game state after withdrawal
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to withdraw prize:", err);
      alert("Failed to withdraw prize. Please try again.");

      // Reset button state
      const withdrawButton = document.getElementById("withdraw-prize-button");
      if (withdrawButton) {
        withdrawButton.textContent = "Withdraw Prize";
        withdrawButton.disabled = false;
      }
    }
  };

  // Use props if provided, otherwise use context values
  const submissions = propSubmissions || contextSubmissions || [];
  const winningNumber =
    propWinningNumber !== undefined
      ? propWinningNumber
      : contextWinningNumber || 0;
  const winner = propWinner || contextWinner || "";
  const prizeAmount = propPrizeAmount || contextPrizeAmount || "0 ETH";

  // Calculate the average and 2/3 of average for animation
  const average =
    submissions.length > 0
      ? submissions.reduce((sum, num) => sum + num, 0) / submissions.length
      : 0;
  const twoThirdsAverage = Math.round((average * 2) / 3);

  // Find closest submission to 2/3 average
  const closestSubmission =
    submissions.length > 0
      ? submissions.reduce((closest, current) => {
          return Math.abs(current - twoThirdsAverage) <
            Math.abs(closest - twoThirdsAverage)
            ? current
            : closest;
        }, submissions[0])
      : 0;

  useEffect(() => {
    // Set all states to true immediately to skip animations
    setShowCalculation(true);
    setCalculationStep(2);
    setShowWinner(true);
    setAnimationComplete(true);
  }, []);

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 rounded-xl border border-cyan-600/30 shadow-lg shadow-cyan-500/20">
      {/* Calculation Card */}
      <Card className="w-full max-w-2xl bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <h3 className="text-xl font-bold text-cyan-300 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Results Calculation
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

            {/* Final result */}
            <div className="mt-4">
              <div className="flex items-center justify-center text-gray-300 bg-blue-900/30 p-3 rounded-lg">
                <span className="text-lg font-bold text-blue-300">
                  Winning Number: {twoThirdsAverage}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winner Announcement */}
      <div className="w-full max-w-2xl">
        <Card className="bg-gradient-to-r from-yellow-900/70 to-amber-900/70 border-yellow-600 overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="flex flex-col items-center text-center z-10 relative">
              <Trophy className="h-16 w-16 text-yellow-300 mb-2" />
              <h2 className="text-2xl font-bold text-white mb-1">
                Winner Announcement
              </h2>
              <div className="flex flex-col items-center justify-center space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                  <h3 className="text-xl font-bold text-yellow-300">Winner</h3>
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </div>
                <p className="text-sm font-mono text-yellow-100">
                  {formatAddress(winner)}
                </p>
              </div>

              <div className="bg-black/30 rounded-lg p-4 mb-4 w-full max-w-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-yellow-200/70 text-sm">Winning Number</p>
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

              {winner && winner.toLowerCase() === account?.toLowerCase() ? (
                <Button
                  id="withdraw-prize-button"
                  onClick={withdrawPrize}
                  className="bg-green-600 hover:bg-green-500 text-white group"
                >
                  Withdraw Prize
                  <Coins className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={onPlayAgain}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white group"
                >
                  Play Again
                  <RefreshCw className="ml-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
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
