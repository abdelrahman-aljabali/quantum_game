// src/components/Home.tsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import GameInterface from "./GameInterface";
import PlayerPortal from "./PlayerPortal";
import { useEthereum } from "@/contexts/EthereumContext";
import { mapOnchainPhase, UIPhase } from "@/utils/gamePhase";

const Home: React.FC = () => {
  const {
    isConnected,
    gamePhase: onchainPhase,
    refreshGameState,
  } = useEthereum();

  // Fetch initial state; EthereumContext handles ongoing updates
  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);

  // Derive UI phase
  const phase = mapOnchainPhase(onchainPhase);

  // Background gradient for each UI phase
  const bgClass = (() => {
    switch (phase) {
      case UIPhase.Waiting:
        return "from-blue-900 to-indigo-900";
      case UIPhase.Submission:
        return "from-purple-900 to-violet-900";
      case UIPhase.Calculating:
        return "from-orange-900 to-amber-900";
      case UIPhase.Results:
        return "from-emerald-900 to-teal-900";
      default:
        return "from-blue-900 to-indigo-900";
    }
  })();

  return (
    <div
      className={`h-screen overflow-hidden bg-gradient-to-br ${bgClass} transition-colors duration-1000 flex flex-col relative`}
    >
      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: Math.random() * 10 + 2,
              height: Math.random() * 10 + 2,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{ y: [0, -1000], opacity: [0, 0.5, 0] }}
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
      <header className="z-10 relative p-4 flex items-center border-b border-white/10">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="mr-3"
        >
          <Zap className="h-8 w-8 text-yellow-400" />
        </motion.div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
          Quantum Consensus
        </h1>
      </header>

      {/* Main */}
      <main className="z-10 relative flex-1 flex p-4 gap-4 overflow-hidden">
        <section className="flex-1">
          <GameInterface />
        </section>
        <aside className="w-80">
          <PlayerPortal />
        </aside>
      </main>

      {/* Footer */}
      <footer className="z-10 relative p-4 text-center text-white/60 text-sm border-t border-white/10">
        Quantum Consensus: Blockchain-based 2/3 Average Game © 2025
      </footer>
    </div>
  );
};

export default Home;
