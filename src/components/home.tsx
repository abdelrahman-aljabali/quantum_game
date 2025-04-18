import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Trophy, Users, Clock, Info } from "lucide-react";
import GameInterface from "./GameInterface";

// Define GamePhase enum to match the contract
enum GamePhase {
  WAITING_FOR_PLAYERS = 0,
  GAME_STARTING = 1,
  SUBMISSIONS_OPEN = 2,
  EVALUATING_RESULTS = 3,
  GAME_ENDED = 4,
}
import PlayerPortal from "./PlayerPortal";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useEthereum } from "@/contexts/EthereumContext";

const Home = () => {
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  // Use Ethereum context
  const {
    isConnected,
    gamePhase: blockchainGamePhase,
    playerCount: blockchainPlayerCount,
    timeRemaining: blockchainTimeRemaining,
    refreshGameState,
  } = useEthereum();

  // Map numeric game phase from blockchain to enum
  const mapBlockchainPhaseToEnum = (phase: number | null): GamePhase => {
    if (phase === null) return GamePhase.WAITING_FOR_PLAYERS;

    switch (phase) {
      case 0:
        return GamePhase.WAITING_FOR_PLAYERS;
      case 1:
        return GamePhase.GAME_STARTING;
      case 2:
        return GamePhase.SUBMISSIONS_OPEN;
      case 3:
        return GamePhase.EVALUATING_RESULTS;
      case 4:
        return GamePhase.GAME_ENDED;
      default:
        return GamePhase.WAITING_FOR_PLAYERS;
    }
  };

  // Get game phase from blockchain or use default
  const gamePhase =
    blockchainGamePhase !== null
      ? mapBlockchainPhaseToEnum(blockchainGamePhase)
      : GamePhase.WAITING_FOR_PLAYERS;

  // Get player count and time remaining from blockchain or use defaults
  const playerCount = blockchainPlayerCount || 0;
  const timeRemaining = blockchainTimeRemaining || 60;

  // Refresh game state periodically
  useEffect(() => {
    // Initial refresh
    refreshGameState();

    // Set up interval to refresh game state
    const interval = setInterval(() => {
      refreshGameState();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [refreshGameState]);

  // Update wallet connection status
  useEffect(() => {
    setIsWalletConnected(isConnected);
  }, [isConnected]);

  // Background color based on game phase
  const getBgColor = () => {
    switch (gamePhase) {
      case GamePhase.WAITING_FOR_PLAYERS:
      case GamePhase.GAME_STARTING:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
      case GamePhase.SUBMISSIONS_OPEN:
        return "bg-gradient-to-br from-purple-900 to-violet-900";
      case GamePhase.EVALUATING_RESULTS:
        return "bg-gradient-to-br from-orange-900 to-amber-900";
      case GamePhase.GAME_ENDED:
        return "bg-gradient-to-br from-emerald-900 to-teal-900";
      default:
        return "bg-gradient-to-br from-blue-900 to-indigo-900";
    }
  };

  // Game phase indicator text and icon
  const getPhaseInfo = () => {
    switch (gamePhase) {
      case GamePhase.WAITING_FOR_PLAYERS:
        return {
          text: "Waiting for Players",
          icon: <Users className="h-5 w-5 mr-2" />,
        };
      case GamePhase.GAME_STARTING:
        return {
          text: "Game Starting Soon",
          icon: <Users className="h-5 w-5 mr-2" />,
        };
      case GamePhase.SUBMISSIONS_OPEN:
        return {
          text: "Submission Phase",
          icon: <Zap className="h-5 w-5 mr-2" />,
        };
      case GamePhase.EVALUATING_RESULTS:
        return {
          text: "Calculating Results",
          icon: <Sparkles className="h-5 w-5 mr-2" />,
        };
      case GamePhase.GAME_ENDED:
        return {
          text: "Results Ready",
          icon: <Trophy className="h-5 w-5 mr-2" />,
        };
      default:
        return {
          text: "Waiting for Players",
          icon: <Users className="h-5 w-5 mr-2" />,
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
          <GameInterface />
        </div>

        {/* Player portal */}
        <div className="w-80 mr-5">
          <PlayerPortal />
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
