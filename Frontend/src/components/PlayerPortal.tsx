/**
 * @fileoverview PlayerPortal Component - Right-side game interface panel
 * 
 * PURPOSE:
 * Provides a comprehensive player interface including wallet connection,
 * game status, player profile, and detailed game instructions.
 * 
 * FEATURES:
 * - Wallet connection/disconnection with MetaMask integration
 * - Real-time game phase tracking with visual indicators
 * - Player profile with dynamic status updates
 * - Tabbed interface for Profile and Instructions
 * - Join/Leave game functionality with entry fee handling
 * - Responsive design with smooth animations
 * 
 * UI/UX DESIGN:
 * - Fixed positioning on right side of screen
 * - Dark theme with colored accents based on game phase
 * - Scrollable content areas for better mobile support
 * - Progressive disclosure of information based on user state
 */

// src/components/PlayerPortal.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  History,
  Users,
  ArrowRight,
  LogOut,
  AlertCircle,
  Coins,
  BookOpen,
  User,
} from "lucide-react";
import { useEthereum, GamePhase } from "@/contexts/EthereumContext";
import GameInstructions from "./GameInstructions";

/**
 * @component PlayerPortal
 * @description Main player interface component with wallet, status, and instructions
 * 
 * STATE MANAGEMENT:
 * - activeTab: Controls Profile vs Instructions tab display
 * - All game state comes from EthereumContext (blockchain source of truth)
 * 
 * PHASE MAPPING:
 * Smart contract has 6 phases, but UI simplifies to 4 user-friendly categories:
 * - waiting: WAITING_FOR_PLAYERS + GAME_STARTING
 * - submission: COMMIT_PHASE + REVEAL_PHASE  
 * - calculating: EVALUATING_RESULTS
 * - results: GAME_ENDED
 */
const PlayerPortal: React.FC = () => {
  // === LOCAL UI STATE ===
  const [activeTab, setActiveTab] = useState("profile");

  // === BLOCKCHAIN STATE (from Context) ===
  const {
    account,              // Connected wallet address
    isConnected,          // Wallet connection status
    isConnecting,         // Connection in progress
    connectWallet,        // Wallet connection function
    disconnectWallet,     // Wallet disconnection function
    playerCount,          // Current players in game
    gamePhase: contextGamePhase, // Raw contract phase
    error,                // Last error message
    joinGame,             // Join game function
    entryFee,             // Entry fee in ETH
    hasJoined,            // Current user joined status
    hasSubmitted,         // Current user submitted guess
    timeRemaining,        // Seconds until next phase
    currentGameContract,  // Contract instance
    leaveGame,            // Leave game function
  } = useEthereum();

  /**
   * @function getGamePhaseString
   * @description Maps complex contract phases to simple UI categories
   * @returns User-friendly phase name for styling and display
   */
  const getGamePhaseString = ():
    | "waiting"      // Players joining, game not started
    | "submission"   // Players committing/revealing guesses
    | "calculating"  // Contract determining winner
    | "results" => { // Game complete, winner known
    switch (contextGamePhase) {
      case GamePhase.WAITING_FOR_PLAYERS:
      case GamePhase.GAME_STARTING:
        return "waiting";
      case GamePhase.COMMIT_PHASE:
      case GamePhase.REVEAL_PHASE:
        return "submission";
      case GamePhase.EVALUATING_RESULTS:
        return "calculating";
      case GamePhase.GAME_ENDED:
        return "results";
      default:
        return "waiting";
    }
  };
  const gamePhase = getGamePhaseString();

  const formatAddress = (address: string | null) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  // Border & glow based on phase
  const getBorderColor = () => {
    switch (gamePhase) {
      case "waiting":
        return "border-blue-500";
      case "submission":
        return "border-green-500";
      case "calculating":
        return "border-yellow-500";
      case "results":
        return "border-purple-500";
      default:
        return "border-gray-300";
    }
  };
  const getGlowEffect = () => {
    switch (gamePhase) {
      case "waiting":
        return "shadow-[0_0_15px_rgba(59,130,246,0.5)]";
      case "submission":
        return "shadow-[0_0_15px_rgba(34,197,94,0.5)]";
      case "calculating":
        return "shadow-[0_0_15px_rgba(234,179,8,0.5)]";
      case "results":
        return "shadow-[0_0_15px_rgba(168,85,247,0.5)]";
      default:
        return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`
    absolute top-5 right-2 // 👈 this places it with 8 spacing from the right
    bg-black/90 backdrop-blur-sm w-[380px] h-[750px]
    rounded-xl border-2 ${getBorderColor()} ${getGlowEffect()}
    overflow-hidden shadow-xl
  `}
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-blue-400" />
            Player Portal
          </h2>

          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2 border border-blue-500">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account}`}
                  />
                  <AvatarFallback>WL</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-gray-400">Connected Wallet</p>
                  <p className="text-sm text-white font-mono">
                    {formatAddress(account)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnectWallet}
                className="h-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
                {!isConnecting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                Connect your wallet to join the game
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <Alert
            variant="destructive"
            className="mb-4 bg-red-900/40 border-red-800"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Game Status */}
        <div className="mb-3 bg-gray-900/60 rounded-lg p-2">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-medium text-gray-400">Game Status</h3>
            <Badge
              variant="outline"
              className={`text-xs px-2 py-1 ${
                  gamePhase === "waiting"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500"
                    : ""
                }
                ${
                  gamePhase === "submission"
                    ? "bg-green-500/20 text-green-300 border-green-500"
                    : ""
                }
                ${
                  gamePhase === "calculating"
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500"
                    : ""
                }
                ${
                  gamePhase === "results"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500"
                    : ""
                }
              `}
            >
              {gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center">
            <Users className="h-3 w-3 text-blue-400 mr-1" />
            <span className="text-white text-xs">{playerCount} Players</span>
            <motion.div
              className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        </div>

        {/* Join / Create */}
        {isConnected && gamePhase === "waiting" && !hasJoined && (
          <div className="mb-3">
            <Button
              onClick={joinGame}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm py-2 disabled:opacity-50"
            >
              {!currentGameContract ? (
                "Create New Game"
              ) : (
                <>
                  <Coins className="mr-1 h-3 w-3" />
                  Join Game{entryFee ? ` (${entryFee} ETH)` : ""}
                </>
              )}
            </Button>
            {entryFee && currentGameContract && (
              <p className="text-xs text-center mt-1 text-gray-400">
                Entry fee: {entryFee} ETH
              </p>
            )}
            {!currentGameContract && (
              <p className="text-xs text-center mt-1 text-gray-400">
                No active game found. Create a new one!
              </p>
            )}
          </div>
        )}

        {/* Joined Indicator */}
        {isConnected && hasJoined && (
          <div className="mb-3 bg-green-900/30 border border-green-700 rounded-lg p-2 text-center">
            <p className="text-green-400 text-sm">
              <Coins className="inline-block mr-1 h-3 w-3" />
              You've joined the game
            </p>

            {hasSubmitted && (
              <p className="text-xs text-green-500 mt-1">
                Number submitted
              </p>
            )}

            {/* ✅ Leave Game Button */}
            {gamePhase === "waiting" && (
              <Button
                onClick={leaveGame}
                className="mt-2 w-full bg-gradient-to-r from-red-600 to-red-400 text-white text-xs py-1"
              >
                Leave Game (Refund)
              </Button>
            )}
          </div>
        )}

        {/* Profile & Instructions Tabs */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/60 mb-2">
              <TabsTrigger 
                value="profile" 
                className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <User className="h-3 w-3 mr-1" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="instructions" 
                className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                How to Play
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              <TabsContent value="profile" className="h-full overflow-y-auto data-[state=active]:block data-[state=inactive]:hidden m-0">
                <div className="pr-2">
                  <Card className="bg-gray-900/60 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-center text-base">
                        Player Profile
                      </CardTitle>
                      <CardDescription className="text-center text-xs">
                        Your game statistics and achievements
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-0">
                      <Avatar className="h-16 w-16 mb-3 border-2 border-blue-500">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                            account || "guest"
                          }`}
                        />
                        <AvatarFallback>WL</AvatarFallback>
                      </Avatar>
                      <h3 className="text-base font-bold text-white">
                        {account ? "Blockchain Player" : "Guest"}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">Joined June 2025</p>

                      <div className="bg-gray-800/60 rounded-lg p-2 text-center mb-3 w-full">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-sm font-bold text-white">
                          {!account
                            ? "Connect Wallet"
                            : !hasJoined
                            ? "Ready to Join"
                            : hasSubmitted
                            ? "Waiting for Results"
                            : "Ready to Play"}
                        </p>
                      </div>

                      {timeRemaining > 0 &&
                        (gamePhase === "waiting" || gamePhase === "submission") && (
                          <div className="bg-gray-800/60 rounded-lg p-2 text-center mb-3 w-full">
                            <p className="text-xs text-gray-400">
                              {gamePhase === "waiting"
                                ? "Game starts in"
                                : "Submission ends in"}
                            </p>
                            <p className="text-sm font-bold text-white">
                              {timeRemaining} seconds
                            </p>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="instructions" className="h-full overflow-y-auto data-[state=active]:block data-[state=inactive]:hidden m-0">
                <div className="pr-2">
                  <GameInstructions />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
};

export default PlayerPortal;
