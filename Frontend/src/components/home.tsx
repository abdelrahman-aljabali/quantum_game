/**
 * @fileoverview Home Component - Main game interface layout and visual orchestration
 * 
 * PURPOSE:
 * Serves as the primary game interface combining the central game area with 
 * the player portal. Provides dynamic visual theming based on game phase
 * and manages the overall user experience flow.
 * 
 * LAYOUT ARCHITECTURE:
 * - Full-screen gradient background with phase-based theming
 * - Header with animated logo and branding
 * - Main area split between GameInterface (left) and PlayerPortal (right)
 * - Footer with game attribution
 * - Animated particle system for visual enhancement
 * 
 * VISUAL DESIGN:
 * - Phase-based color schemes (blue→purple→orange→green)
 * - Smooth transitions between game phases
 * - Floating particle animation for engagement
 * - Glassmorphism effects with transparency layers
 * 
 * RESPONSIVE APPROACH:
 * - Fixed sidebar width (320px) for player portal
 * - Flexible main game area that adapts to remaining space
 * - Overflow handling for content that exceeds viewport
 */

// src/components/Home.tsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import GameInterface from "./GameInterface";
import PlayerPortal from "./PlayerPortal";
import { useEthereum } from "@/contexts/EthereumContext";
import { mapOnchainPhase, UIPhase } from "@/utils/gamePhase";

/**
 * @component Home
 * @description Main application interface that orchestrates the game experience
 * 
 * RESPONSIBILITIES:
 * - Layout management for game interface and player portal
 * - Phase-based visual theming and transitions
 * - Background animation and particle effects
 * - Initial game state loading
 * 
 * STATE MANAGEMENT:
 * - Consumes blockchain state from EthereumContext
 * - Maps complex on-chain phases to simplified UI phases
 * - Triggers initial game state refresh on mount
 */
const Home: React.FC = () => {
  // === BLOCKCHAIN STATE ===
  const {
    isConnected,           // Wallet connection status (for future features)
    gamePhase: onchainPhase, // Raw contract phase (6 states)
    refreshGameState,      // Function to sync with blockchain
  } = useEthereum();

  // === INITIALIZATION ===
  // Fetch initial game state on component mount
  // EthereumContext handles ongoing updates via event listeners and polling
  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);

  // === UI PHASE MAPPING ===
  // Convert 6 on-chain phases to 4 user-friendly UI phases
  const phase = mapOnchainPhase(onchainPhase);

  /**
   * @function bgClass
   * @description Dynamic background gradient based on current game phase
   * 
   * PHASE COLOR MAPPING:
   * - Waiting: Blue tones (calm, preparation)
   * - Submission: Purple tones (active, strategic thinking)
   * - Calculating: Orange tones (processing, anticipation)
   * - Results: Green tones (completion, success)
   */
  const bgClass = (() => {
    switch (phase) {
      case UIPhase.Waiting:
        return "from-blue-900 to-indigo-900";      // Calm preparation phase
      case UIPhase.Submission:
        return "from-purple-900 to-violet-900";    // Active strategy phase
      case UIPhase.Calculating:
        return "from-orange-900 to-amber-900";     // Processing anticipation
      case UIPhase.Results:
        return "from-emerald-900 to-teal-900";     // Completion celebration
      default:
        return "from-blue-900 to-indigo-900";      // Fallback to waiting
    }
  })();

  return (
    <div
      className={`h-screen overflow-hidden bg-gradient-to-br ${bgClass} transition-colors duration-1000 flex flex-col relative`}
    >
      {/* === BACKGROUND ANIMATION LAYER === */}
      {/* Floating particles for visual engagement and depth */}
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

      {/* === HEADER === */}
      {/* Application branding and identity */}
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

      {/* === MAIN CONTENT AREA === */}
      {/* Split layout: GameInterface (left) + PlayerPortal (right) */}
      <main className="z-10 relative flex-1 flex p-4 gap-4 overflow-hidden">
        <section className="flex-1">
          <GameInterface />
        </section>
        <aside className="w-80">
          <PlayerPortal />
        </aside>
      </main>

      {/* === FOOTER === */}
      {/* Attribution and copyright information */}
      <footer className="z-10 relative p-4 text-center text-white/60 text-sm border-t border-white/10">
        Quantum Consensus: Blockchain-based 2/3 Average Game © 2025
      </footer>
    </div>
  );
};

export default Home;
