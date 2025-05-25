// Essential UI component: Interactive number selection with commit-reveal pattern implementation
// Purpose: Provides secure two-phase number submission (commit encrypted, then reveal original)
import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
  KeyRound,
  Eye,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useCommitReveal } from "@/hooks/useCommitReveal";
import { useEthereum } from "@/contexts/EthereumContext";

interface NumberSelectorProps {
  onSelectNumber?: (num: number) => void;
  selectedNumber?: number | null;
  isSubmissionPhase?: boolean;
  isRevealPhase?: boolean;
}

const NumberSelector: React.FC<NumberSelectorProps> = ({
  onSelectNumber,
  selectedNumber: propSelectedNumber,
  isSubmissionPhase: propIsSubmissionPhase,
  isRevealPhase: propIsRevealPhase,
}) => {
  const {
    number,
    setNumber,
    salt,
    setSalt,
    commit,
    reveal,
    hasSubmitted,
    setHasSubmitted,
    hasRevealed,
  } = useCommitReveal();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { gamePhase, isConnected, error } = useEthereum();

  const isSubmissionPhase =
    propIsSubmissionPhase !== undefined
      ? propIsSubmissionPhase
      : gamePhase === 2;
  const isRevealPhase =
    propIsRevealPhase !== undefined ? propIsRevealPhase : gamePhase === 3;

  useEffect(() => {
    if (propSelectedNumber !== undefined && propSelectedNumber !== null) {
      setNumber(propSelectedNumber);
    }
  }, [propSelectedNumber, setNumber]);

  const handleValueChange = (vals: number[]) => {
    setNumber(vals[0]);
    onSelectNumber?.(vals[0]);
  };

  const handleCommit = async () => {
    setIsSubmitting(true);
    try {
      await commit();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setHasSubmitted(true); // ✅ prevent further commits
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReveal = async () => {
    setIsRevealing(true);
    try {
      await reveal();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-indigo-600/30 shadow-lg shadow-indigo-500/20">
      {/* Title */}
      <div className="mb-8 text-center">
        <motion.h2
          className="text-2xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Select Your Number
        </motion.h2>
        <motion.p
          className="text-slate-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Choose a number between 0 and 1000. Closest to 2/3 of the average
          wins!
        </motion.p>
      </div>

      {/* Error */}
      {error && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-900/40 border-red-800"
        >
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Slider */}
      <div className="relative mb-12">
        <div className="text-center mb-8">
          <div className="bg-slate-700 rounded-lg py-2 px-4 inline-block border-2 border-indigo-500 shadow-lg shadow-indigo-500/30">
            <span className="text-3xl font-bold text-white">{number}</span>
          </div>
        </div>
        <div className="flex justify-between mb-2 px-2 text-slate-400 text-sm">
          <span>0</span>
          <span>250</span>
          <span>500</span>
          <span>750</span>
          <span>1000</span>
        </div>
        <div className="py-4">
          <Slider
            max={1000}
            step={1}
            value={[number]}
            onValueChange={handleValueChange}
            disabled={hasSubmitted || !isSubmissionPhase || isSubmitting}
          />
        </div>
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-70 blur-sm -mt-4 mb-8 animate-pulse" />
      </div>

      {/* Salt Input */}
      {isSubmissionPhase && !hasSubmitted && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-white text-center mb-2">
            Enter a Secret Salt
          </h3>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            <Input
              type="text"
              placeholder="Enter a secret salt"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              disabled={isSubmitting}
              className="bg-slate-800 border-indigo-500 text-white"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center">
        {isSubmissionPhase && !hasSubmitted ? (
          <Button
            onClick={handleCommit}
            disabled={!isConnected || isSubmitting || hasSubmitted || !salt}
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
            <span>{isSubmitting ? "Committing..." : "Commit Number"}</span>
          </Button>
        ) : isSubmissionPhase && hasSubmitted ? (
          <Button
            disabled
            size="lg"
            className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2"
          >
            <Check className="h-5 w-5" />
            <span>Number Committed</span>
          </Button>
        ) : isRevealPhase && !hasRevealed ? (
          <Button
            onClick={handleReveal}
            disabled={!isConnected || isRevealing}
            size="lg"
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2"
          >
            {isRevealing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
            <span>{isRevealing ? "Revealing..." : "Reveal Number"}</span>
          </Button>
        ) : isRevealPhase && hasRevealed ? (
          <Button
            disabled
            size="lg"
            className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2"
          >
            <Check className="h-5 w-5" />
            <span>Number Revealed</span>
          </Button>
        ) : null}
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: "50%", y: "50%", opacity: 1, scale: 0 }}
              animate={{
                x: [`50%`, `${Math.random() * 200 - 100}px`],
                y: [`50%`, `-${Math.random() * 100 + 50}px`],
                opacity: 0,
                scale: Math.random() * 0.5 + 0.5,
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <Sparkles
                size={Math.random() * 20 + 10}
                className="text-indigo-400"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NumberSelector;
