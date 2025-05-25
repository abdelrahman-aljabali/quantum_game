/**
 * @fileoverview Game Phase Mapping Utility - Converts blockchain phases to UI phases
 * 
 * PURPOSE:
 * Provides a clean abstraction layer between the complex on-chain game phases
 * and simplified UI phases for better user experience and maintainable code.
 * 
 * PHASE MAPPING STRATEGY:
 * The smart contract has 6 detailed phases for precise game logic, but the UI
 * simplifies this to 4 user-friendly phases for clearer communication.
 * 
 * ON-CHAIN → UI MAPPING:
 * - WAITING_FOR_PLAYERS + GAME_STARTING → Waiting
 * - COMMIT_PHASE + REVEAL_PHASE → Submission  
 * - EVALUATING_RESULTS → Calculating
 * - GAME_ENDED → Results
 * 
 * BENEFITS:
 * - Simplified UI logic with fewer conditional branches
 * - Consistent theming and animations across related phases
 * - Future-proof interface if contract phases change
 * - Better user understanding of game flow
 */

// src/utils/gamePhase.ts
import { GamePhase as OnchainPhase } from "@/contexts/EthereumContext";

/**
 * @enum UIPhase
 * @description Simplified game phases for frontend UI components
 * 
 * PHASE DESCRIPTIONS:
 * - Waiting: Players joining, countdown to start
 * - Submission: Players committing and revealing numbers
 * - Calculating: Smart contract processing results
 * - Results: Winner determined, game complete
 */
export enum UIPhase {
  Waiting = "waiting",        // Player recruitment and game start countdown
  Submission = "submission",  // Number commitment and reveal phases
  Calculating = "calculating", // Result calculation and winner determination
  Results = "results",        // Game completion and prize distribution
}

/**
 * @function mapOnchainPhase
 * @description Maps detailed contract phases to simplified UI phases
 * @param p The on-chain game phase from the smart contract
 * @returns Corresponding UI phase for component rendering
 * 
 * MAPPING LOGIC:
 * - Groups related contract phases into logical UI categories
 * - Provides fallback to 'Waiting' for unknown/null phases
 * - Enables consistent UI behavior across phase transitions
 */
export function mapOnchainPhase(p: OnchainPhase | null): UIPhase {
  switch (p) {
    case OnchainPhase.WAITING_FOR_PLAYERS:
    case OnchainPhase.GAME_STARTING:
      return UIPhase.Waiting;
    case OnchainPhase.COMMIT_PHASE:
    case OnchainPhase.REVEAL_PHASE:
      return UIPhase.Submission;
    case OnchainPhase.EVALUATING_RESULTS:
      return UIPhase.Calculating;
    case OnchainPhase.GAME_ENDED:
      return UIPhase.Results;
    default:
      return UIPhase.Waiting;
  }
}
