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
import { useEthereum } from "@/contexts/EthereumContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";

interface NumberSelectorProps {
  onSelectNumber?: (number: number) => void;
  selectedNumber?: number | null;
  isSubmissionPhase?: boolean;
  timeRemaining?: number;
  isRevealPhase?: boolean;
}

const NumberSelector = ({
  onSelectNumber,
  selectedNumber: propSelectedNumber,
  isSubmissionPhase: propIsSubmissionPhase,
  timeRemaining: propTimeRemaining,
  isRevealPhase: propIsRevealPhase,
}: NumberSelectorProps) => {
  const [selectedValue, setSelectedValue] = useState<number>(500);
  const [salt, setSalt] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [committedHash, setCommittedHash] = useState<string>("");

  // Use Ethereum context
  const {
    isConnected,
    gamePhase,
    timeRemaining: contextTimeRemaining,
    submitNumber,
    revealNumber,
    hasSubmitted,
    hasRevealed,
    error,
  } = useEthereum();

  // Determine if we're in submission phase based on context or props
  const isSubmissionPhase =
    propIsSubmissionPhase !== undefined
      ? propIsSubmissionPhase
      : gamePhase === 2; // 2 = SUBMISSIONS_OPEN phase

  // Determine if we're in reveal phase based on context or props
  const isRevealPhase =
    propIsRevealPhase !== undefined ? propIsRevealPhase : gamePhase === 3; // 3 = REVEAL_PHASE

  // Use time remaining from context or props
  const timeRemaining =
    propTimeRemaining !== undefined ? propTimeRemaining : contextTimeRemaining;

  // Reset state when submission phase changes
  useEffect(() => {
    if (isSubmissionPhase) {
      setIsSubmitted(false);
      setIsRevealed(false);
    }

    if (isRevealPhase) {
      setIsRevealed(false);
    }
  }, [isSubmissionPhase, isRevealPhase]);

  // Update state based on contract state
  useEffect(() => {
    setIsSubmitted(hasSubmitted);
    setIsRevealed(hasRevealed);
  }, [hasSubmitted, hasRevealed]);

  // Update selected value when prop changes
  useEffect(() => {
    if (propSelectedNumber !== undefined && propSelectedNumber !== null) {
      setSelectedValue(propSelectedNumber);
    }
  }, [propSelectedNumber]);

  const handleValueChange = (value: number[]) => {
    setSelectedValue(value[0]);
    if (onSelectNumber) {
      onSelectNumber(value[0]);
    }
  };

  // Generate a hash of the number and salt
  const generateCommitHash = (number: number, salt: string): string => {
    // Use ethers.js to hash the number and salt
    // Convert number to string, concatenate with salt, and hash
    return ethers.keccak256(ethers.toUtf8Bytes(`${number}${salt}`));
  };

  // Handle salt input change
  const handleSaltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalt(e.target.value);
  };

  // Handle commit (submit hashed number)
  const handleCommit = async () => {
    if (!isConnected) {
      // Show a message to connect wallet
      return;
    }

    // Validate number range
    if (selectedValue < 0 || selectedValue > 1000) {
      console.error("Number must be between 0 and 1000");
      return;
    }

    // Validate salt
    if (!salt) {
      console.error("Please enter a salt value");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate hash
      const hash = generateCommitHash(selectedValue, salt);
      setCommittedHash(hash);

      // Submit hash to blockchain
      await submitNumber(hash);

      // Show success UI
      setIsSubmitted(true);
      setShowConfetti(true);

      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);

      // If onSelectNumber callback is provided, call it
      if (onSelectNumber) {
        onSelectNumber(selectedValue);
      }

      // Store the number and salt in localStorage for later reveal
      localStorage.setItem("gameCommitNumber", selectedValue.toString());
      localStorage.setItem("gameCommitSalt", salt);
    } catch (err) {
      console.error("Error committing number:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reveal
  const handleReveal = async () => {
    if (!isConnected) {
      return;
    }

    setIsRevealing(true);

    try {
      // Get stored values if not already set
      const numberToReveal =
        selectedValue ||
        Number(localStorage.getItem("gameCommitNumber") || "0");
      const saltToReveal = salt || localStorage.getItem("gameCommitSalt") || "";

      if (!numberToReveal || !saltToReveal) {
        console.error("Could not find the committed number or salt");
        return;
      }

      // Call reveal function on contract
      await revealNumber(numberToReveal, saltToReveal);

      // Update UI
      setIsRevealed(true);
      setShowConfetti(true);

      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);
    } catch (err) {
      console.error("Error revealing number:", err);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-indigo-600/30 shadow-lg shadow-indigo-500/20">
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
          Choose a number between 0 and 1000. The closest to 2/3 of the average
          wins!
        </motion.p>
      </div>

      {/* Error message */}
      {error && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-900/40 border-red-800"
        >
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative mb-12">
        {/* Current value display */}
        <div className="text-center mb-8">
          <div className="bg-slate-700 rounded-lg py-2 px-4 inline-block border-2 border-indigo-500 shadow-lg shadow-indigo-500/30">
            <span className="text-3xl font-bold text-white">
              {selectedValue}
            </span>
          </div>
        </div>

        {/* Number scale markers */}
        <div className="flex justify-between mb-2 px-2 text-slate-400 text-sm">
          <span>0</span>
          <span>250</span>
          <span>500</span>
          <span>750</span>
          <span>1000</span>
        </div>

        {/* Slider */}
        <div className="py-4">
          <Slider
            defaultValue={[500]}
            max={1000}
            step={1}
            value={[selectedValue]}
            onValueChange={handleValueChange}
            disabled={isSubmitted || !isSubmissionPhase || isSubmitting}
            className={`${isSubmitted || isSubmitting ? "opacity-50" : ""}`}
          />
        </div>

        {/* Glowing track overlay for visual effect */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-70 blur-sm -mt-4 mb-8 animate-pulse"></div>
      </div>

      {/* Salt input field - only show during submission phase */}
      {isSubmissionPhase && !isSubmitted && (
        <div className="mb-8">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-white mb-2">
              Enter a Secret Salt
            </h3>
            <p className="text-sm text-slate-300">
              This helps keep your number secure until reveal time
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            <Input
              type="text"
              placeholder="Enter a secret word or phrase"
              value={salt}
              onChange={handleSaltChange}
              className="bg-slate-800 border-indigo-500 text-white"
              disabled={isSubmitted || isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center">
        {/* Commit button - show during submission phase if not submitted */}
        {isSubmissionPhase && !isSubmitted ? (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleCommit}
              disabled={
                !isSubmissionPhase || !isConnected || isSubmitting || !salt
              }
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-indigo-600/30 transition-all duration-300 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5" />
                  <span>Commit Number</span>
                </>
              )}
            </Button>
          </motion.div>
        ) : isSubmissionPhase && isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              disabled
              size="lg"
              className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-green-600/30 flex items-center gap-2"
            >
              <Check className="h-5 w-5" />
              <span>Number Committed</span>
            </Button>
          </motion.div>
        ) : isRevealPhase && !isRevealed ? (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleReveal}
              disabled={!isRevealPhase || !isConnected || isRevealing}
              size="lg"
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-amber-600/30 transition-all duration-300 flex items-center gap-2"
            >
              {isRevealing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Revealing...</span>
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5" />
                  <span>Reveal Number</span>
                </>
              )}
            </Button>
          </motion.div>
        ) : isRevealPhase && isRevealed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              disabled
              size="lg"
              className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-green-600/30 flex items-center gap-2"
            >
              <Check className="h-5 w-5" />
              <span>Number Revealed</span>
            </Button>
          </motion.div>
        ) : null}
      </div>

      {/* Time remaining indicator */}
      {((isSubmissionPhase && !isSubmitted) ||
        (isRevealPhase && !isRevealed)) && (
        <motion.div
          className="mt-6 text-center text-slate-300 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>Time remaining: {timeRemaining} seconds</span>
        </motion.div>
      )}

      {/* Not connected warning */}
      {!isConnected && isSubmissionPhase && (
        <motion.div
          className="mt-6 text-center text-amber-300 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span>Connect your wallet to submit a number</span>
        </motion.div>
      )}

      {/* Confetti effect on submission */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: `calc(50% + ${Math.random() * 200 - 100}px)`,
                y: `calc(50% + ${Math.random() * 100 - 50}px)`,
                opacity: 1,
                scale: 0,
              }}
              animate={{
                x: `calc(50% + ${Math.random() * 400 - 200}px)`,
                y: `calc(50% - ${Math.random() * 500 + 100}px)`,
                opacity: 0,
                scale: Math.random() * 0.5 + 0.5,
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <Sparkles
                className="text-indigo-400"
                size={Math.random() * 20 + 10}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NumberSelector;
