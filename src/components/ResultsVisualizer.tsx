import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Trophy,
  BarChart3,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface ResultsVisualizerProps {
  submissions?: number[];
  winningNumber?: number;
  winner?: string;
  prizeAmount?: string;
  onPlayAgain?: () => void;
}

const ResultsVisualizer = ({
  submissions = [123, 245, 367, 489, 512, 634, 756, 878, 901],
  winningNumber = 334,
  winner = "Player1",
  prizeAmount = "0.5 ETH",
  onPlayAgain = () => console.log("Play again clicked"),
}: ResultsVisualizerProps) => {
  const [showCalculation, setShowCalculation] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [calculationStep, setCalculationStep] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Calculate the average and 2/3 of average for animation
  const average =
    submissions.reduce((sum, num) => sum + num, 0) / submissions.length;
  const twoThirdsAverage = Math.round((average * 2) / 3);

  // Sort submissions for display
  const sortedSubmissions = [...submissions].sort((a, b) => a - b);

  // Find closest submission to 2/3 average
  const closestSubmission = submissions.reduce((closest, current) => {
    return Math.abs(current - twoThirdsAverage) <
      Math.abs(closest - twoThirdsAverage)
      ? current
      : closest;
  }, submissions[0]);

  useEffect(() => {
    // Start the animation sequence
    const timer1 = setTimeout(() => setShowCalculation(true), 1000);
    const timer2 = setTimeout(() => setCalculationStep(1), 2500);
    const timer3 = setTimeout(() => setCalculationStep(2), 4000);
    const timer4 = setTimeout(() => setShowWinner(true), 5500);
    const timer5 = setTimeout(() => setAnimationComplete(true), 7000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 rounded-xl border border-cyan-600/30 shadow-lg shadow-cyan-500/20">
      {/* Number line visualization */}
      <div className="relative w-full h-64 mb-8">
        {/* Number line */}
        <div className="absolute bottom-0 w-full h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full animate-pulse"></div>

        {/* Tick marks */}
        {[0, 250, 500, 750, 1000].map((tick) => (
          <div
            key={tick}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${tick / 10}%` }}
          >
            <div className="h-4 w-1 bg-gray-400 mb-1"></div>
            <span className="text-gray-400 text-xs">{tick}</span>
          </div>
        ))}

        {/* Submissions dots */}
        {sortedSubmissions.map((submission, index) => (
          <motion.div
            key={index}
            className="absolute bottom-8 w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"
            style={{ left: `${submission / 10}%` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          />
        ))}

        {/* 2/3 Average Line */}
        {showCalculation && calculationStep >= 1 && (
          <motion.div
            className="absolute bottom-0 h-40 w-1 bg-green-500"
            style={{ left: `${twoThirdsAverage / 10}%` }}
            initial={{ height: 0 }}
            animate={{ height: 40 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="absolute -top-6 -left-16 bg-green-900/80 text-green-300 px-3 py-1 rounded-md text-sm whitespace-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              2/3 Avg: {twoThirdsAverage}
            </motion.div>
          </motion.div>
        )}

        {/* Winner highlight */}
        {showWinner && (
          <motion.div
            className="absolute bottom-8 w-8 h-8 rounded-full border-4 border-yellow-400"
            style={{ left: `${closestSubmission / 10}%`, marginLeft: "-8px" }}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <motion.div
              className="absolute -top-16 -left-16 bg-yellow-900/80 text-yellow-300 px-3 py-1 rounded-md text-sm whitespace-nowrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Winner: {closestSubmission}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Calculation Card */}
      <Card className="w-full max-w-2xl bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <h3 className="text-xl font-bold text-cyan-300 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Results Calculation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <motion.div
                className="bg-gray-900/80 p-4 rounded-lg border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-gray-400 text-sm">Total Submissions</p>
                <p className="text-2xl font-bold text-white">
                  {submissions.length}
                </p>
              </motion.div>

              <motion.div
                className="bg-gray-900/80 p-4 rounded-lg border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: showCalculation ? 1 : 0,
                  y: showCalculation ? 0 : 20,
                }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-gray-400 text-sm">Average</p>
                <p className="text-2xl font-bold text-white">
                  {average.toFixed(2)}
                </p>
              </motion.div>

              <motion.div
                className="bg-gray-900/80 p-4 rounded-lg border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: calculationStep >= 1 ? 1 : 0,
                  y: calculationStep >= 1 ? 0 : 20,
                }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-gray-400 text-sm">2/3 of Average</p>
                <p className="text-2xl font-bold text-green-400">
                  {twoThirdsAverage}
                </p>
              </motion.div>
            </div>

            {/* Calculation steps */}
            <div className="mt-4 space-y-2">
              <motion.div
                className="flex items-center text-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: showCalculation ? 1 : 0 }}
                transition={{ delay: 0.8 }}
              >
                <span className="bg-blue-900/50 text-blue-300 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                  1
                </span>
                <span>
                  Calculate average of all submissions: {average.toFixed(2)}
                </span>
              </motion.div>

              <motion.div
                className="flex items-center text-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: calculationStep >= 1 ? 1 : 0 }}
                transition={{ delay: 1.2 }}
              >
                <span className="bg-blue-900/50 text-blue-300 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                  2
                </span>
                <span>
                  Multiply by 2/3: {average.toFixed(2)} × 2/3 ={" "}
                  {twoThirdsAverage}
                </span>
              </motion.div>

              <motion.div
                className="flex items-center text-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: calculationStep >= 2 ? 1 : 0 }}
                transition={{ delay: 1.6 }}
              >
                <span className="bg-blue-900/50 text-blue-300 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                  3
                </span>
                <span>
                  Find closest submission to {twoThirdsAverage}:{" "}
                  {closestSubmission}
                </span>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winner Announcement */}
      {showWinner && (
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-r from-yellow-900/70 to-amber-900/70 border-yellow-600 overflow-hidden">
            <CardContent className="p-6 relative">
              {/* Particle effects */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-yellow-300/30"
                    initial={{
                      x: Math.random() * 100 - 50 + "%",
                      y: Math.random() * 100 - 50 + "%",
                      opacity: 0,
                    }}
                    animate={{
                      x: [null, Math.random() * 100 - 50 + "%"],
                      y: [null, Math.random() * 100 - 50 + "%"],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 3,
                      repeat: Infinity,
                      repeatType: "loop",
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center text-center z-10 relative">
                <Trophy className="h-16 w-16 text-yellow-300 mb-2" />
                <h2 className="text-2xl font-bold text-white mb-1">
                  Winner Announcement
                </h2>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                  <h3 className="text-xl font-bold text-yellow-300">
                    {winner}
                  </h3>
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </div>

                <div className="bg-black/30 rounded-lg p-4 mb-4 w-full max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-yellow-200/70 text-sm">
                        Winning Number
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

                {animationComplete && (
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
        </motion.div>
      )}
    </div>
  );
};

export default ResultsVisualizer;
