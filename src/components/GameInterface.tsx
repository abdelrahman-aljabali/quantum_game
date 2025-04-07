import React, { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Trophy, Loader2 } from "lucide-react";
import NumberSelector from "./NumberSelector";
import ResultsVisualizer from "./ResultsVisualizer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Game phases
enum GamePhase {
  WAITING = "waiting",
  SUBMISSION = "submission",
  CALCULATING = "calculating",
  RESULTS = "results",
}

interface GameInterfaceProps {
  playerCount?: number;
  timeRemaining?: number;
  maxTime?: number;
  phase?: GamePhase;
  onSubmitNumber?: (number: number) => void;
  submissions?: number[];
  winningNumber?: number;
  winner?: string;
  prizeAmount?: string;
}

const GameInterface: React.FC<GameInterfaceProps> = ({
  playerCount = 0,
  timeRemaining = 45,
  maxTime = 120,
  phase = GamePhase.WAITING,
  onSubmitNumber = () => {},
  submissions = [123, 456, 789, 234, 567, 890, 345, 678, 901, 432, 765, 98],
  winningNumber = 234,
  winner = "0x1234...5678",
  prizeAmount = "0.5 ETH",
}) => {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Calculate progress percentage for timer
  const progressPercentage = (timeRemaining / maxTime) * 100;

  // Handle number submission
  const handleSubmit = () => {
    if (selectedNumber !== null) {
      onSubmitNumber(selectedNumber);
    }
  };

  // Background color based on game phase
  const getBgColor = () => {
    switch (phase) {
      case GamePhase.WAITING:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
      case GamePhase.SUBMISSION:
        return "bg-gradient-to-br from-purple-900 to-indigo-900";
      case GamePhase.CALCULATING:
        return "bg-gradient-to-br from-orange-900 to-red-900";
      case GamePhase.RESULTS:
        return "bg-gradient-to-br from-green-900 to-emerald-900";
      default:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
    }
  };

  // Render content based on game phase
  const renderPhaseContent = () => {
    switch (phase) {
      case GamePhase.WAITING:
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
                  {playerCount} / {playerCount < 3 ? "waiting for 3+" : "15"}
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
                  <span className="font-bold">{timeRemaining}</span> seconds
                  until start
                </p>
              </div>
            </motion.div>
          </div>
        );

      case GamePhase.SUBMISSION:
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
                />
              </div>

              <div className="mb-8">
                <Button
                  onClick={handleSubmit}
                  disabled={selectedNumber === null}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Number
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

      case GamePhase.CALCULATING:
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

      case GamePhase.RESULTS:
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
                  average={Math.round(
                    (submissions.reduce((a, b) => a + b, 0) /
                      submissions.length) *
                      (2 / 3),
                  )}
                />
              </div>

              <div className="flex justify-center space-x-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
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
export { GamePhase };
