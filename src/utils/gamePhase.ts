// src/utils/gamePhase.ts
import { GamePhase as OnchainPhase } from "@/contexts/EthereumContext";

export enum UIPhase {
  Waiting = "waiting",
  Submission = "submission",
  Calculating = "calculating",
  Results = "results",
}

/**
 * Map the numeric on‑chain GamePhase into one of our four UI phases.
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
