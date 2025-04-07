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
import {
  Wallet,
  Trophy,
  History,
  Users,
  ArrowRight,
  LogOut,
} from "lucide-react";

interface PlayerPortalProps {
  isConnected?: boolean;
  walletAddress?: string;
  playerCount?: number;
  gamePhase?: "waiting" | "submission" | "calculating" | "results";
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
}

const PlayerPortal = ({
  isConnected = false,
  walletAddress = "0x1234...5678",
  playerCount = 0,
  gamePhase = "waiting",
  onConnectWallet = () => {},
  onDisconnectWallet = () => {},
}: PlayerPortalProps) => {
  const [activeTab, setActiveTab] = useState("profile");

  // Mock data for leaderboard
  const leaderboardData = [
    { rank: 1, name: "CryptoKing", wins: 24, avatar: "JK" },
    { rank: 2, name: "BlockchainQueen", wins: 18, avatar: "BQ" },
    { rank: 3, name: "EtherMaster", wins: 15, avatar: "EM" },
    { rank: 4, name: "TokenTitan", wins: 12, avatar: "TT" },
    { rank: 5, name: "SolidityWizard", wins: 10, avatar: "SW" },
    { rank: 6, name: "Web3Warrior", wins: 8, avatar: "WW" },
    { rank: 7, name: "NFTNinja", wins: 7, avatar: "NN" },
    { rank: 8, name: "DeFiDragon", wins: 6, avatar: "DD" },
    { rank: 9, name: "GasGuru", wins: 5, avatar: "GG" },
    { rank: 10, name: "MintMaster", wins: 4, avatar: "MM" },
  ];

  // Mock data for game history
  const gameHistoryData = [
    { id: 1, date: "2025-03-15", yourNumber: 420, average: 630, winner: false },
    { id: 2, date: "2025-03-12", yourNumber: 333, average: 500, winner: true },
    { id: 3, date: "2025-03-10", yourNumber: 250, average: 375, winner: false },
    { id: 4, date: "2025-03-08", yourNumber: 420, average: 630, winner: false },
    { id: 5, date: "2025-03-05", yourNumber: 180, average: 270, winner: true },
    { id: 6, date: "2025-03-01", yourNumber: 500, average: 750, winner: false },
  ];

  // Border color based on game phase
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

  // Glow effect based on game phase
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
      className={`bg-black/90 backdrop-blur-sm w-[350px] h-[800px] rounded-xl border-2 ${getBorderColor()} ${getGlowEffect()} overflow-hidden shadow-xl`}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header with wallet info */}
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
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${walletAddress}`}
                  />
                  <AvatarFallback>WL</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-gray-400">Connected Wallet</p>
                  <p className="text-sm text-white font-mono">
                    {walletAddress}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnectWallet}
                className="h-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={onConnectWallet}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white"
            >
              Connect Wallet
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Game status */}
        <div className="mb-6 bg-gray-900/60 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-400">Game Status</h3>
            <Badge
              variant="outline"
              className={`
                ${gamePhase === "waiting" ? "bg-blue-500/20 text-blue-300 border-blue-500" : ""}
                ${gamePhase === "submission" ? "bg-green-500/20 text-green-300 border-green-500" : ""}
                ${gamePhase === "calculating" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500" : ""}
                ${gamePhase === "results" ? "bg-purple-500/20 text-purple-300 border-purple-500" : ""}
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

        {/* Tabs for profile, leaderboard, history */}
        <Tabs
          defaultValue="profile"
          className="flex-1 flex flex-col"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <TabsContent value="profile" className="h-full">
              <Card className="bg-gray-900/60 border-gray-800 h-full">
                <CardHeader>
                  <CardTitle>Player Profile</CardTitle>
                  <CardDescription>
                    Your game statistics and achievements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center mb-6">
                    <Avatar className="h-20 w-20 mb-4 border-2 border-blue-500">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${walletAddress}`}
                      />
                      <AvatarFallback>WL</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-bold text-white">
                      CryptoPlayer
                    </h3>
                    <p className="text-sm text-gray-400">Joined Mar 2025</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-400">Games Played</p>
                      <p className="text-xl font-bold text-white">24</p>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-400">Wins</p>
                      <p className="text-xl font-bold text-green-400">3</p>
                    </div>
                  </div>

                  <div className="bg-gray-800/60 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      Achievements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500">
                        First Win
                      </Badge>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500">
                        Perfect Guess
                      </Badge>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500">
                        Early Adopter
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard" className="h-full">
              <Card className="bg-gray-900/60 border-gray-800 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                    Leaderboard
                  </CardTitle>
                  <CardDescription>Top players by wins</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[380px] pr-4">
                    <div className="space-y-2">
                      {leaderboardData.map((player) => (
                        <div
                          key={player.rank}
                          className={`flex items-center p-3 rounded-lg ${player.rank <= 3 ? "bg-gradient-to-r from-gray-800/80 to-gray-700/40" : "bg-gray-800/40"}`}
                        >
                          <div
                            className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3
                            ${player.rank === 1 ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500" : ""}
                            ${player.rank === 2 ? "bg-gray-400/20 text-gray-300 border border-gray-400" : ""}
                            ${player.rank === 3 ? "bg-amber-600/20 text-amber-300 border border-amber-600" : ""}
                            ${player.rank > 3 ? "bg-gray-700 text-gray-400" : ""}
                          `}
                          >
                            {player.rank}
                          </div>
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                            />
                            <AvatarFallback>{player.avatar}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {player.name}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Trophy className="h-3 w-3 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium text-white">
                              {player.wins}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="h-full">
              <Card className="bg-gray-900/60 border-gray-800 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="mr-2 h-5 w-5 text-blue-400" />
                    Game History
                  </CardTitle>
                  <CardDescription>Your recent games</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[380px] pr-4">
                    <div className="space-y-3">
                      {gameHistoryData.map((game) => (
                        <div
                          key={game.id}
                          className={`p-3 rounded-lg ${game.winner ? "bg-green-900/20 border border-green-800" : "bg-gray-800/40"}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-gray-400">
                              Game #{game.id}
                            </p>
                            <p className="text-xs text-gray-400">{game.date}</p>
                            {game.winner && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500">
                                Winner
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500">
                                Your Number
                              </p>
                              <p className="text-lg font-bold text-white">
                                {game.yourNumber}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">
                                2/3 Average
                              </p>
                              <p className="text-lg font-bold text-white">
                                {game.average}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default PlayerPortal;
