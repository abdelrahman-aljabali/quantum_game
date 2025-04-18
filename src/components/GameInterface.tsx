import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Trophy, Loader2 } from "lucide-react";
import NumberSelector from "./NumberSelector";
import ResultsVisualizer from "./ResultsVisualizer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEthereum } from "@/contexts/EthereumContext";

// Game phases - using string literals for better Fast Refresh compatibility
export type GamePhaseType =
  | "waiting"
  | "submission"
  | "calculating"
  | "results";

// Constants for game phases
export const GAME_PHASE_WAITING: GamePhaseType = "waiting";
export const GAME_PHASE_SUBMISSION: GamePhaseType = "submission";
export const GAME_PHASE_CALCULATING: GamePhaseType = "calculating";
export const GAME_PHASE_RESULTS: GamePhaseType = "results";

interface GameInterfaceProps {
  onSubmitNumber?: (number: number) => void;
}

const GameInterface: React.FC<GameInterfaceProps> = ({ onSubmitNumber }) => {
  // Get all game state from Ethereum context
  const {
    gamePhase,
    playerCount,
    timeRemaining,
    submissions: contractSubmissions,
    winningNumber: contractWinningNumber,
    winner: contractWinner,
    prizeAmount: contractPrizeAmount,
    submitNumber,
    hasJoined,
    hasSubmitted,
  } = useEthereum();

  // Default values for when contract data is not yet available
  const maxTime = 120;
  const submissions =
    contractSubmissions && contractSubmissions.length > 0
      ? contractSubmissions
      : [];
  const winningNumber = contractWinningNumber || 0;
  const winner = contractWinner || "";
  const prizeAmount = contractPrizeAmount || "0 ETH";

  // Map numeric game phase to string type
  const getPhaseString = (): GamePhaseType => {
    if (gamePhase === null) return GAME_PHASE_WAITING;

    switch (gamePhase) {
      case 0: // WAITING_FOR_PLAYERS
      case 1: // GAME_STARTING
        return GAME_PHASE_WAITING;
      case 2: // SUBMISSIONS_OPEN
        return GAME_PHASE_SUBMISSION;
      case 3: // REVEAL_PHASE
        return GAME_PHASE_SUBMISSION; // Reuse submission phase UI but with reveal button
      case 4: // EVALUATING_RESULTS
        return GAME_PHASE_CALCULATING;
      case 5: // GAME_ENDED
        return GAME_PHASE_RESULTS;
      default:
        return GAME_PHASE_WAITING;
    }
  };

  const phase = getPhaseString();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Calculate progress percentage for timer
  const progressPercentage = (timeRemaining / maxTime) * 100;

  // Handle number submission
  const handleSubmit = async () => {
    if (selectedNumber === null) {
      console.error("No number selected");
      return;
    }

    if (onSubmitNumber) {
      onSubmitNumber(selectedNumber);
    }

    try {
      // Call the contract method
      await submitNumber(selectedNumber);
      console.log("Number submitted successfully:", selectedNumber);

      // Clear selection after successful submission
      setSelectedNumber(null);
    } catch (error) {
      console.error("Error submitting number:", error);
    }
  };

  // Background color based on game phase
  const getBgColor = () => {
    switch (phase) {
      case GAME_PHASE_WAITING:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
      case GAME_PHASE_SUBMISSION:
        return "bg-gradient-to-br from-purple-900 to-indigo-900";
      case GAME_PHASE_CALCULATING:
        return "bg-gradient-to-br from-orange-900 to-red-900";
      case GAME_PHASE_RESULTS:
        return "bg-gradient-to-br from-green-900 to-emerald-900";
      default:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
    }
  };

  // Render content based on game phase
  const renderPhaseContent = () => {
    switch (phase) {
      case GAME_PHASE_WAITING:
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
                  key={playerCount || 0}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-bold"
                >
                  {playerCount || 0} /{" "}
                  {(playerCount || 0) < 3 ? "waiting for 3+" : "15 max"}
                </motion.span>
              </div>
              <p className="text-lg text-blue-200 mb-8">
                The game will start once at least 3 players have joined
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
              <div className="mt-8">
                <p className="text-xl text-white">
                  <span className="font-bold">Waiting for players</span>
                </p>
              </div>
            </motion.div>
          </div>
        );

      case GAME_PHASE_SUBMISSION:
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
                Choose a number between 0-1000. The closest to 2/3 of the
                average wins!
              </p>

              <div className="mb-8">
                <NumberSelector
                  onSelectNumber={setSelectedNumber}
                  selectedNumber={selectedNumber}
                  isSubmissionPhase={gamePhase === 2}
                  isRevealPhase={gamePhase === 3}
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
                  {timeRemaining} seconds remaining
                </span>
              </div>

              <div className="mt-4 w-full max-w-md mx-auto">
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </motion.div>
          </div>
        );

      case GAME_PHASE_CALCULATING:
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
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
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
              <div className="mt-8 flex justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -15, 0],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.2,
                    }}
                    className="w-3 h-3 rounded-full bg-orange-400"
                  />
                ))}
              </div>
            </motion.div>
          </div>
        );

      case GAME_PHASE_RESULTS:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center w-full"
            >
              <div className="mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 10,
                    delay: 0.3,
                  }}
                  className="inline-block p-4 rounded-full bg-green-600 mb-4"
                >
                  <Trophy className="h-12 w-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white">
                  Results Announced!
                </h2>
              </div>

              <Card className="bg-black bg-opacity-30 border-green-500 mb-8 max-w-2xl mx-auto">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                    <div className="p-4 bg-black bg-opacity-30 rounded-lg">
                      <h3 className="text-lg font-medium text-green-400 mb-2">
                        Winner
                      </h3>
                      <p className="font-mono text-sm">{winner}</p>
                    </div>
                    <div className="p-4 bg-black bg-opacity-30 rounded-lg">
                      <h3 className="text-lg font-medium text-green-400 mb-2">
                        Prize
                      </h3>
                      <p className="font-bold text-xl">{prizeAmount}</p>
                    </div>
                    <div className="p-4 bg-black bg-opacity-30 rounded-lg">
                      <h3 className="text-lg font-medium text-green-400 mb-2">
                        Winning Number
                      </h3>
                      <p className="font-bold text-xl">{winningNumber}</p>
                    </div>
                    <div className="p-4 bg-black bg-opacity-30 rounded-lg">
                      <h3 className="text-lg font-medium text-green-400 mb-2">
                        Total Players
                      </h3>
                      <p className="font-bold text-xl">{playerCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mb-8">
                <ResultsVisualizer
                  submissions={submissions}
                  winningNumber={winningNumber}
                  winner={winner}
                  prizeAmount={prizeAmount}
                  onPlayAgain={() => window.location.reload()}
                />
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                >
                  Play Again
                </Button>
                <Button
                  variant="outline"
                  className="border-green-500 text-green-400 hover:bg-green-900 hover:text-green-200"
                >
                  View Leaderboard
                </Button>
              </div>
            </motion.div>
          </div>
        );

      default:
        return <div>Unknown game phase</div>;
    }
  };

  return (
    <div
      className={`w-full h-full rounded-xl overflow-hidden shadow-2xl ${getBgColor()} transition-colors duration-1000`}
    >
      <div className="w-full h-full p-6 backdrop-blur-sm">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default GameInterface;
