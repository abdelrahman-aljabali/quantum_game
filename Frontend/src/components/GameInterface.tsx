/**
 * @fileoverview GameInterface Component - Central game area with phase-specific interfaces
 * 
 * PURPOSE:
 * Primary interactive game component that provides different interfaces for each
 * game phase. Handles player number selection, submission, and results display.
 * 
 * PHASE-SPECIFIC INTERFACES:
 * - Waiting: Player count display with animated waiting indicator
 * - Submission: Number selector with countdown timer and submission button
 * - Calculating: Loading animation while smart contract processes results
 * - Results: Comprehensive results visualization with play-again option
 * 
 * KEY INTERACTIONS:
 * - Number selection (0-1000) with validation
 * - Secure number submission to blockchain
 * - Real-time countdown timers
 * - Automatic phase advancement when timers expire
 * - Results visualization with mathematical breakdown
 * 
 * VISUAL DESIGN:
 * - Phase-based background gradients and color schemes
 * - Smooth animations and transitions between phases
 * - Progress bars for time-sensitive phases
 * - Responsive layout adapting to content requirements
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Trophy, Loader2 } from "lucide-react";
import NumberSelector from "./NumberSelector";
import ResultsVisualizer from "./ResultsVisualizer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEthereum, GamePhase } from "@/contexts/EthereumContext";
import { mapOnchainPhase, UIPhase } from "@/utils/gamePhase";

interface GameInterfaceProps {
  onSubmitNumber?: (num: number) => void;  // Optional callback for number submission
}

/**
 * @component GameInterface
 * @description Central game area that adapts its interface based on current game phase
 * 
 * STATE MANAGEMENT:
 * - selectedNumber: Player's current number selection (local state)
 * - hasAutoAdvanced: Prevents multiple auto-advance calls per phase
 * - All game state comes from EthereumContext (blockchain source of truth)
 * 
 * PHASE ADAPTATION:
 * Component renders completely different interfaces based on game phase,
 * providing appropriate controls and information for each stage.
 */
const GameInterface: React.FC<GameInterfaceProps> = ({ onSubmitNumber }) => {
  // === BLOCKCHAIN STATE (from EthereumContext) ===
  const {
    gamePhase,                    // Raw contract phase (6 states)
    playerCount,                  // Current number of players
    timeRemaining,                // Seconds until next phase
    submissions: contractSubmissions,      // Revealed player submissions
    winningNumber: contractWinningNumber,  // Calculated 2/3 average target
    winner: contractWinner,                // Winning player address
    prizeAmount: contractPrizeAmount,      // Prize pool amount
    submitNumber,                 // Function to submit number to contract
    hasJoined,                   // Current user participation status
    hasSubmitted,                // Current user submission status
    advancePhase,                // Manual phase advancement function
    resetGameUI,                 // Game reset function
  } = useEthereum();

  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const maxTime = 120;
  const submissions = contractSubmissions ?? [];
  const winningNumber = contractWinningNumber ?? 0;
  const winner = contractWinner ?? "";
  const prizeAmount = contractPrizeAmount ?? "0 ETH";

  const phase = mapOnchainPhase(gamePhase);
  const progressPercentage = (timeRemaining / maxTime) * 100;

  const [hasAutoAdvanced, setHasAutoAdvanced] = useState(false);

  // 🚀 auto‑advance on zero
  useEffect(() => {
    // only try to auto‑advance once per phase
    const shouldAdvance =
      timeRemaining <= 0 &&
      (gamePhase === GamePhase.GAME_STARTING ||
        gamePhase === GamePhase.COMMIT_PHASE ||
        gamePhase === GamePhase.REVEAL_PHASE) &&
      !hasAutoAdvanced;

    if (shouldAdvance) {
      advancePhase();
      setHasAutoAdvanced(true);
    }

    // reset the flag if the timer ever goes back above zero
    if (timeRemaining > 0 && hasAutoAdvanced) {
      setHasAutoAdvanced(false);
    }
  }, [timeRemaining, gamePhase, advancePhase, hasAutoAdvanced]);

  const handleSubmit = async () => {
    if (selectedNumber === null) {
      console.error("No number selected");
      return;
    }
    onSubmitNumber?.(selectedNumber);
    try {
      // submitNumber expects a string hash
      await submitNumber(selectedNumber.toString());
      setSelectedNumber(null);
    } catch (error) {
      console.error("Error submitting number:", error);
    }
  };

  const getBgColor = () => {
    switch (phase) {
      case UIPhase.Waiting:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
      case UIPhase.Submission:
        return "bg-gradient-to-br from-purple-900 to-indigo-900";
      case UIPhase.Calculating:
        return "bg-gradient-to-br from-orange-900 to-red-900";
      case UIPhase.Results:
        return "bg-gradient-to-br from-green-900 to-emerald-900";
      default:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case UIPhase.Waiting:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-6 text-white">
                Waiting for Players
              </h2>
              <div className="flex items-center justify-center mb-8 text-white">
                <Users className="mr-2 h-6 w-6" />
                <motion.span
                  key={playerCount}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-bold"
                >
                  {playerCount} /{" "}
                  {playerCount < 3 ? "waiting for 3+" : "15 max"}
                </motion.span>
              </div>
              <p className="text-lg text-blue-200 mb-8">
                The game will start once at least 3 players have joined
              </p>
              <div className="relative w-64 h-64 mx-auto">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                  }}
                  className="absolute inset-0 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      delay: 0.2,
                    }}
                    className="absolute inset-2 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: 0.4,
                      }}
                      className="absolute inset-4 rounded-full bg-blue-500 bg-opacity-40 flex items-center justify-center"
                    >
                      <div className="absolute inset-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Clock className="h-16 w-16 text-white" />
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>

              {gamePhase === GamePhase.GAME_STARTING && (
                <p className="text-xl text-white mb-2">
                  Game starts in{" "}
                  <span className="font-bold">{timeRemaining}</span> seconds
                </p>
              )}

              <p className="text-xl text-white mt-8">
                <span className="font-bold">Waiting for players</span>
              </p>
            </motion.div>
          </div>
        );

      case UIPhase.Submission:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center w-full"
            >
              <h2 className="text-3xl font-bold mb-6 text-white">
                Select Your Number
              </h2>
              <p className="text-lg text-purple-200 mb-8">
                Choose a number between 0–1000. Closest to 2/3 of the average
                wins!
              </p>

              <div className="mb-8">
                <NumberSelector
                  onSelectNumber={setSelectedNumber}
                  selectedNumber={selectedNumber}
                  isSubmissionPhase={gamePhase === GamePhase.COMMIT_PHASE}
                  isRevealPhase={gamePhase === GamePhase.REVEAL_PHASE}
                />
              </div>

              <div className="mb-8">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    selectedNumber === null || hasSubmitted || !hasJoined
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasSubmitted
                    ? "Number Submitted"
                    : !hasJoined
                    ? "Join Game First"
                    : "Submit Number"}
                </Button>
              </div>

              <div className="flex items-center justify-center space-x-2 text-white">
                <Clock className="h-5 w-5" />
                <span className="text-xl">
                  {timeRemaining} seconds remaining
                </span>
              </div>

              <div className="mt-4 w-full max-w-md mx-auto">
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </motion.div>
          </div>
        );

      case UIPhase.Calculating:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-6 text-white">
                Calculating Results
              </h2>
              <div className="relative w-40 h-40 mx-auto mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                  className="absolute inset-4 rounded-full border-4 border-orange-300 border-b-transparent"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Loader2 className="h-12 w-12 text-white animate-spin" />
                </motion.div>
              </div>
              <p className="text-lg text-orange-200">
                Processing all submissions and determining the winner...
              </p>
            </motion.div>
          </div>
        );

      case UIPhase.Results:
        return (
          <div className="flex flex-col items-center justify-center h-full ">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center w-full"
            >
              <div className="mb-6"></div>

              <ResultsVisualizer
                submissions={submissions}
                winningNumber={winningNumber}
                winner={winner}
                prizeAmount={prizeAmount}
                onPlayAgain={resetGameUI}
              />
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`
        w-full h-full rounded-xl overflow-hidden shadow-2xl
        ${getBgColor()} transition-colors duration-1000
      `}
    >
      <div className="w-full h-full p-6 backdrop-blur-sm">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default GameInterface;
