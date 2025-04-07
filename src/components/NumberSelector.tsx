import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";

interface NumberSelectorProps {
  onSubmit?: (value: number) => void;
  isSubmissionPhase?: boolean;
  timeRemaining?: number;
}

const NumberSelector = ({
  onSubmit = () => {},
  isSubmissionPhase = true,
  timeRemaining = 60,
}: NumberSelectorProps) => {
  const [selectedValue, setSelectedValue] = useState<number>(500);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Reset state when submission phase changes
  useEffect(() => {
    if (isSubmissionPhase) {
      setIsSubmitted(false);
    }
  }, [isSubmissionPhase]);

  const handleValueChange = (value: number[]) => {
    setSelectedValue(value[0]);
  };

  const handleSubmit = () => {
    onSubmit(selectedValue);
    setIsSubmitted(true);
    setShowConfetti(true);

    // Hide confetti after animation
    setTimeout(() => {
      setShowConfetti(false);
    }, 2000);
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

      <div className="relative mb-12">
        {/* Current value display */}
        <motion.div
          className="absolute -top-16 left-1/2 transform -translate-x-1/2"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <div className="bg-slate-700 rounded-full h-24 w-24 flex items-center justify-center border-4 border-indigo-500 shadow-lg shadow-indigo-500/30">
            <span className="text-3xl font-bold text-white">
              {selectedValue}
            </span>
          </div>
        </motion.div>

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
            disabled={isSubmitted || !isSubmissionPhase}
            className={`${isSubmitted ? "opacity-50" : ""}`}
          />
        </div>

        {/* Glowing track overlay for visual effect */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-70 blur-sm -mt-4 mb-8 animate-pulse"></div>
      </div>

      {/* Submit button */}
      <div className="flex justify-center">
        {!isSubmitted ? (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSubmit}
              disabled={!isSubmissionPhase}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-indigo-600/30 transition-all duration-300 flex items-center gap-2"
            >
              <span>Submit Number</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        ) : (
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
              <span>Number Submitted</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Time remaining indicator */}
      {isSubmissionPhase && !isSubmitted && (
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

      {/* Hint text */}
      <div className="mt-8 text-center text-slate-400 text-sm">
        <p>
          Hint: Think strategically! What number do you think others will
          choose?
        </p>
      </div>
    </div>
  );
};

export default NumberSelector;
