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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  History,
  Users,
  ArrowRight,
  LogOut,
  AlertCircle,
  Coins,
} from "lucide-react";
import { useEthereum, GamePhase } from "@/contexts/EthereumContext";

const PlayerPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState("profile");

  const {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    playerCount,
    gamePhase: contextGamePhase,
    error,
    joinGame,
    entryFee,
    hasJoined,
    hasSubmitted,
    timeRemaining,
    currentGameContract,
  } = useEthereum();

  // Map on‑chain phase to our UI strings
  const getGamePhaseString = ():
    | "waiting"
    | "submission"
    | "calculating"
    | "results" => {
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
        bg-black/90 backdrop-blur-sm w-[350px] h-[750px]
        rounded-xl border-2 ${getBorderColor()} ${getGlowEffect()}
        overflow-hidden shadow-xl
      `}
    >
      <div className="p-4 h-full flex flex-col">
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
        <div className="mb-6 bg-gray-900/60 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-400">Game Status</h3>
            <Badge
              variant="outline"
              className={`
                ${
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
            <Users className="h-4 w-4 text-blue-400 mr-2" />
            <span className="text-white text-sm">{playerCount} Players</span>
            <motion.div
              className="ml-2 h-2 w-2 rounded-full bg-green-500"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        </div>

        {/* Join / Create */}
        {isConnected && gamePhase === "waiting" && !hasJoined && (
          <div className="mb-6">
            <Button
              onClick={joinGame}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold disabled:opacity-50"
            >
              {!currentGameContract ? (
                "Create New Game"
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Join Game{entryFee ? ` (${entryFee} ETH)` : ""}
                </>
              )}
            </Button>
            {entryFee && currentGameContract && (
              <p className="text-xs text-center mt-2 text-gray-400">
                Entry fee: {entryFee} ETH
              </p>
            )}
            {!currentGameContract && (
              <p className="text-xs text-center mt-2 text-gray-400">
                No active game found. Create a new one to start playing!
              </p>
            )}
          </div>
        )}

        {/* Joined Indicator */}
        {isConnected && hasJoined && (
          <div className="mb-6 bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
            <p className="text-green-400 font-medium">
              <Coins className="inline-block mr-2 h-4 w-4" />
              You've joined the game
            </p>
            {hasSubmitted && (
              <p className="text-xs text-green-500 mt-1">
                Your number has been submitted
              </p>
            )}
          </div>
        )}

        {/* Profile & Timer Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <ScrollArea className="mt-4 flex-1">
            <TabsContent value="profile">
              <Card className="bg-gray-900/60 border-gray-800 mb-4">
                <CardHeader>
                  <CardTitle className="text-white text-center font-bold">
                    Player Profile
                  </CardTitle>
                  <CardDescription className="text-center">
                    Your game statistics and achievements
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <Avatar className="h-20 w-20 mb-4 border-2 border-blue-500">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                        account || "guest"
                      }`}
                    />
                    <AvatarFallback>WL</AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-bold text-white">
                    {account ? "Blockchain Player" : "Guest"}
                  </h3>
                  <p className="text-sm text-gray-400">Joined Mar 2025</p>

                  <div className="bg-gray-800/60 rounded-lg p-3 text-center mt-6 mb-6 w-full">
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="text-xl font-bold text-white">
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
                      <div className="bg-gray-800/60 rounded-lg p-3 text-center mb-6 w-full">
                        <p className="text-sm text-gray-400">
                          {gamePhase === "waiting"
                            ? "Game starts in"
                            : "Submission ends in"}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {timeRemaining} seconds
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="leaderboard">
              {/* Leaderboard content here */}
            </TabsContent>
            <TabsContent value="history">
              {/* History content here */}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default PlayerPortal;
