/**
 * @fileoverview GameInstructions Component - Comprehensive player education
 * 
 * PURPOSE:
 * Provides complete educational content about the 2/3 Average Game including
 * rules, strategy, game theory, security features, and step-by-step guidance.
 * 
 * EDUCATIONAL STRUCTURE:
 * 1. Objective - Core game rules and winning condition
 * 2. Game Phases - Detailed flow from joining to results
 * 3. How to Win - Mathematical examples and calculations
 * 4. Strategic Thinking - Game theory levels and psychology
 * 5. Security & Fairness - Blockchain benefits and commit-reveal
 * 6. Quick Start Guide - Step-by-step instructions for new players
 * 
 * DESIGN PHILOSOPHY:
 * - Progressive disclosure from simple to complex concepts
 * - Visual examples with real numbers
 * - Game theory education for strategic depth
 * - Security transparency to build trust
 * - Practical guidance for immediate action
 */

import React from "react";
import { motion } from "framer-motion";
import { 
  Users,        // Player count indicators
  Clock,        // Time and phase management
  Calculator,   // Mathematical calculations
  Trophy,       // Winning and prizes
  Coins,        // Entry fees and rewards
  Shield,       // Security and safety
  Target,       // Objectives and goals
  ArrowRight,   // Step-by-step progression
  CheckCircle   // Verification and completion
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * @component GameInstructions
 * @description Educational content component explaining all aspects of the 2/3 Average Game
 * 
 * CONTENT STRATEGY:
 * - Starts with simple objective, builds to complex strategy
 * - Uses concrete examples (300, 600, 900) for clarity
 * - Explains game theory levels (0, 1, 2, ∞) for depth
 * - Emphasizes security features to build trust
 * - Provides actionable quick start guide
 */
const GameInstructions: React.FC = () => {
  return (
    <div className="space-y-4 text-white pb-4">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            How to Play: 2/3 Average Game
          </h2>
          <p className="text-gray-300 text-base">
            A strategic game theory experiment on the blockchain
          </p>
        </motion.div>
      </div>

      {/* Game Objective */}
      <Card className="bg-gray-900/40 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white">
            <Target className="h-5 w-5 mr-2 text-blue-400" />
            Objective
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300 pt-0">
          <p className="mb-2">
            <strong className="text-white">Goal:</strong> Choose a number closest to <strong>2/3 of the average</strong> of all submitted numbers.
          </p>
          <p className="text-blue-300">
            💡 <strong>Strategy Tip:</strong> Think about what others will choose, then choose 2/3 of that!
          </p>
        </CardContent>
      </Card>

      {/* Game Phases */}
      <Card className="bg-gray-900/40 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white">
            <Clock className="h-5 w-5 mr-2 text-purple-400" />
            Game Phases
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-0">
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500 mt-1">
              1
            </Badge>
            <div>
              <h4 className="font-medium text-white">Waiting Phase</h4>
              <p className="text-gray-300">At least 3 players must join (max 60). Pay 0.01 ETH entry fee.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500 mt-1">
              2
            </Badge>
            <div>
              <h4 className="font-medium text-white">Commit Phase (2 minutes)</h4>
              <p className="text-gray-300">Choose your number (0-1000) secretly. Numbers are encrypted until reveal.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500 mt-1">
              3
            </Badge>
            <div>
              <h4 className="font-medium text-white">Reveal Phase (100 seconds)</h4>
              <p className="text-gray-300">Reveal your original number to prove your commitment.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500 mt-1">
              4
            </Badge>
            <div>
              <h4 className="font-medium text-white">Results</h4>
              <p className="text-gray-300">Winner is determined and can withdraw their prize!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Win */}
      <Card className="bg-gray-900/40 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white">
            <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
            How to Win
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-0">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <h4 className="font-medium text-yellow-300 mb-2">Calculation Example:</h4>
            <div className="text-gray-300 space-y-1">
              <p>• Players submit: 300, 600, 900</p>
              <p>• Average: (300 + 600 + 900) ÷ 3 = 600</p>
              <p>• Target: 2/3 × 600 = 400</p>
              <p>• Winner: Player who submitted 300 (closest to 400)</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span>Winner takes ~95% of prize pool (5% service fee)</span>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Tips */}
      <Card className="bg-gray-900/40 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white">
            <Calculator className="h-5 w-5 mr-2 text-cyan-400" />
            Strategic Thinking
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300 pt-0">
          <div className="space-y-2">
            <p><strong className="text-cyan-300">Level 0:</strong> "I'll pick 500 (middle of 0-1000)"</p>
            <p><strong className="text-cyan-300">Level 1:</strong> "Others will pick ~500, so 2/3 × 500 = 333"</p>
            <p><strong className="text-cyan-300">Level 2:</strong> "Others will think like Level 1, so 2/3 × 333 = 222"</p>
            <p><strong className="text-cyan-300">Level ∞:</strong> "Perfect rationality leads to 0"</p>
          </div>
          <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-200">
            💭 The optimal strategy depends on how rational you think other players are!
          </div>
        </CardContent>
      </Card>

      {/* Security & Fairness */}
      <Card className="bg-gray-900/40 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white">
            <Shield className="h-5 w-5 mr-2 text-emerald-400" />
            Security & Fairness
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300 space-y-1 pt-0">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span><strong>Commit-Reveal:</strong> Your number is hidden until everyone submits</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span><strong>Blockchain Verified:</strong> All calculations are transparent and immutable</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span><strong>No Cheating:</strong> Early exits allowed only before game starts</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card className="bg-gray-900/40 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white">
            <ArrowRight className="h-5 w-5 mr-2 text-blue-400" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>        <CardContent className="text-sm pt-0">
          <ol className="space-y-2 text-gray-300">
            <li className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">1</span>
              <span>Connect your MetaMask wallet to the Hardhat Local network</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">2</span>
              <span>Click "Join Game" and pay 0.01 ETH entry fee</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">3</span>
              <span>Wait for 3+ players, then game automatically starts</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">4</span>
              <span>Choose your strategic number and submit during commit phase</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">5</span>
              <span>Reveal your number during reveal phase to confirm</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">6</span>
              <span>If you win, withdraw your prize from the smart contract!</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameInstructions; 