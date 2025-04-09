import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Trophy, Users, Clock, Info } from "lucide-react";
import GameInterface from "./GameInterface";
import PlayerPortal from "./PlayerPortal";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Game phases
enum GamePhase {
  WAITING = "waiting",
  SUBMISSION = "submission",
  CALCULATING = "calculating",
  RESULTS = "results",
}

const Home = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.WAITING);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  // For demo purposes - cycle through game phases
  const advanceGamePhase = () => {
    switch (gamePhase) {
      case GamePhase.WAITING:
        setGamePhase(GamePhase.SUBMISSION);
        break;
      case GamePhase.SUBMISSION:
        setGamePhase(GamePhase.CALCULATING);
        break;
      case GamePhase.CALCULATING:
        setGamePhase(GamePhase.RESULTS);
        break;
      case GamePhase.RESULTS:
        setGamePhase(GamePhase.WAITING);
        break;
    }
  };

  // Background color based on game phase
  const getBgColor = () => {
    switch (gamePhase) {
      case GamePhase.WAITING:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
      case GamePhase.SUBMISSION:
        return "bg-gradient-to-br from-purple-900 to-violet-900";
      case GamePhase.CALCULATING:
        return "bg-gradient-to-br from-orange-900 to-amber-900";
      case GamePhase.RESULTS:
        return "bg-gradient-to-br from-emerald-900 to-teal-900";
    }
  };

  // Game phase indicator text and icon
  const getPhaseInfo = () => {
    switch (gamePhase) {
      case GamePhase.WAITING:
        return {
          text: "Waiting for Players",
          icon: <Users className="h-5 w-5 mr-2" />,
        };
      case GamePhase.SUBMISSION:
        return {
          text: "Submission Phase",
          icon: <Zap className="h-5 w-5 mr-2" />,
        };
      case GamePhase.CALCULATING:
        return {
          text: "Calculating Results",
          icon: <Sparkles className="h-5 w-5 mr-2" />,
        };
      case GamePhase.RESULTS:
        return {
          text: "Results Ready",
          icon: <Trophy className="h-5 w-5 mr-2" />,
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div
      className={`h-screen overflow-hidden ${getBgColor()} transition-colors duration-1000 flex flex-col`}
    >
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10 z-0"
            style={{
              width: Math.random() * 10 + 2,
              height: Math.random() * 10 + 2,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -1000],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              delay: Math.random() * 20,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="mr-3"
          >
            <Zap className="h-8 w-8 text-yellow-400" />
          </motion.div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
            Quantum Consensus
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex p-4 gap-4 pr-6 relative z-10 overflow-hidden">
        {/* Game interface */}
        <div className="flex-1">
          <GameInterface
            gamePhase={gamePhase}
            playerCount={playerCount}
            timeRemaining={timeRemaining}
            advanceGamePhase={advanceGamePhase}
          />
        </div>

        {/* Player portal */}
        <div className="w-80 mr-5">
          <PlayerPortal
            isWalletConnected={isWalletConnected}
            setIsWalletConnected={setIsWalletConnected}
            gamePhase={gamePhase}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-white/60 text-sm border-t border-white/10 relative z-10">
        <p>
          Quantum Consensus: Blockchain-based 2/3 Average Game - All
          transactions secured on the Ethereum network © 2025
        </p>
      </footer>
    </div>
  );
};

export default Home;
