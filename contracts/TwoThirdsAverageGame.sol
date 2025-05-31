// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TwoThirdsAverageGame
 * @dev Implementation of the classic 2/3 Average Game on blockchain
 * 
 * GAME THEORY:
 * Players submit numbers (0-1000). Winner is closest to 2/3 of the average.
 * Uses commit-reveal pattern for fair play - no player can see others' choices.
 * 
 * GAME FLOW:
 * 1. WAITING_FOR_PLAYERS: Players join by paying entry fee
 * 2. GAME_STARTING: Timer starts when minimum players reached
 * 3. COMMIT_PHASE: Players submit encrypted numbers (commitment)
 * 4. REVEAL_PHASE: Players reveal original numbers with salt
 * 5. EVALUATING_RESULTS: Smart contract calculates winner
 * 6. GAME_ENDED: Winner can withdraw prize
 * 
 * SECURITY:
 * - Commit-reveal prevents frontrunning
 * - ReentrancyGuard prevents reentrancy attacks
 * - Pull-over-push withdrawal pattern prevents DoS
 * - Ownable for administrative functions
 */
contract TwoThirdsAverageGame is Ownable, ReentrancyGuard {
    // === GAME CONFIGURATION ===
    uint256 public minPlayers;        // Minimum players to start (usually 3)
    uint256 public maxPlayers;        // Maximum players allowed (usually 60)
    uint256 public commitDuration;    // Time for commit phase (e.g., 120 seconds)
    uint256 public revealDuration;    // Time for reveal phase (e.g., 100 seconds)
    uint256 public entryFee;          // Entry fee in wei (e.g., 0.01 ETH)
    uint256 public serviceFeePercent; // Platform fee percentage (e.g., 5%)
    uint256 public autoStartDelay;    // Grace period after min players reached

   
    enum GamePhase {
        WAITING_FOR_PLAYERS,
        GAME_STARTING,
        COMMIT_PHASE,
        REVEAL_PHASE,
        EVALUATING_RESULTS,
        GAME_ENDED
    }
    GamePhase public currentPhase;

    // === TIMING SYSTEM ===
    uint256 public minPlayersReachedTime;                

    struct Player {
        bytes32 commitment;
        uint256 revealedGuess;
        bool hasCommitted;
        bool hasRevealed;
        bool hasJoined;
    }
    mapping(address => Player) public players;   // Player address => Player data
    address[] public playerAddresses;            // Array for iteration

    // === GAME RESULTS ===
    uint256 public average;           // Average of all revealed guesses
    uint256 public twoThirdsAverage;  // Target value (2/3 * average)
    address public winner;            // Player closest to target
    uint256 public prizePool;         // Total entry fees collected

    // === WITHDRAWAL SYSTEM ===
    mapping(address => uint256) public pendingWithdrawals; // Pull-over-push pattern

    event PlayerJoined(address indexed player, uint256 entryFeePaid);
    event GameStarting(
        uint256 startTime,
        uint256 commitStart,
        uint256 commitEnd,
        uint256 entryFee,
        uint256 minPlayers,
        uint256 maxPlayers
    );
    event GuessCommitted(address indexed player);
    event GuessRevealed(address indexed player, uint256 guess);
    event GameEnded(uint256 average, uint256 twoThirdsAverage, address winner, uint256 prize);
    event Withdrawal(address indexed recipient, uint256 amount);

   constructor(
    uint256 _minPlayers,
    uint256 _maxPlayers,
    uint256 _commitDuration,
    uint256 _revealDuration,
    uint256 _entryFee,
    uint256 _serviceFeePercent,
    uint256 _autoStartDelay
) Ownable(msg.sender) {
    require(_minPlayers >= 3, "Min players >= 3");
    require(_maxPlayers > _minPlayers, "Max > min");
    require(_commitDuration > 0, "Commit dur > 0");
    require(_revealDuration > 0, "Reveal dur > 0");
    require(_autoStartDelay > 0, "Delay > 0");
    require(_serviceFeePercent <= 20, "Fee <= 20%");

    minPlayers        = _minPlayers;
    maxPlayers        = _maxPlayers;
    commitDuration    = _commitDuration;
    revealDuration    = _revealDuration;
    entryFee          = _entryFee;
    serviceFeePercent = _serviceFeePercent;
    autoStartDelay    = _autoStartDelay;

    // initial on‐chain phase
    currentPhase = GamePhase.WAITING_FOR_PLAYERS;
}


    /**
     * @dev Main entry point for players to join the game
     * @notice Players must pay exact entry fee to join
     * 
     * REQUIREMENTS:
     * - Game must be in WAITING_FOR_PLAYERS or GAME_STARTING phase
     * - Must not exceed max players
     * - Player must not have already joined
     * - Must send exact entry fee amount
     * 
     * SIDE EFFECTS:
     * - Adds player to game roster
     * - Increases prize pool
     * - May trigger game start timer if min players reached
     * - May auto-advance to COMMIT_PHASE if delay expired
     */
    /**
     * @dev Main entry point for players to join the game
     * @notice Players must pay exact entry fee to join
     */
   function joinGame() external payable nonReentrant {
    // only allow joining in the waiting or pre-start window
    require(
        getPhase() == GamePhase.WAITING_FOR_PLAYERS ||
        getPhase() == GamePhase.GAME_STARTING,
        "Cannot join"
    );
    // block late joiners once the grace period expired
    if (
        currentPhase == GamePhase.GAME_STARTING &&
        block.timestamp >= minPlayersReachedTime + autoStartDelay
    ) {
        revert("Join window closed");
    }
    require(playerAddresses.length < maxPlayers, "Game full");
    require(!players[msg.sender].hasJoined,   "Already joined");
    require(msg.value == entryFee,             "Wrong entry fee");

    // record the new player
    players[msg.sender] = Player({
        commitment:    0,
        revealedGuess: 0,
        hasCommitted:  false,
        hasRevealed:   false,
        hasJoined:     true
    });
    playerAddresses.push(msg.sender);
    prizePool += msg.value;
    emit PlayerJoined(msg.sender, msg.value);

    // once we hit quorum for the first time, stamp our start time
    if (playerAddresses.length >= minPlayers && minPlayersReachedTime == 0) {
        // mark the timestamp and flip to GAME_STARTING
        minPlayersReachedTime = block.timestamp;
        currentPhase = GamePhase.GAME_STARTING;

        // emit with computed deadlines
        emit GameStarting(
            minPlayersReachedTime,                                      
            minPlayersReachedTime + autoStartDelay,                     // commit phase opens
            minPlayersReachedTime + autoStartDelay + commitDuration,    // commit phase closes
            entryFee,
            minPlayers,
            maxPlayers
        );
    }
}


    /**
     * @dev Phase 1: Players submit encrypted guesses (commit-reveal pattern)
     * @param hash keccak256(guess, salt) where guess is 0-1000 and salt is random
     * 
     * COMMIT-REVEAL SECURITY:
     * Players must choose their number AND a random salt, then submit:
     * hash = keccak256(abi.encodePacked(guess, salt))
     * 
     * This prevents:
     * - Front-running (seeing others' choices before submitting)
     * - Last-mover advantage
     * - Collusion based on visible on-chain data
     */
 /**
 * @dev Phase 1: Players submit encrypted guesses (commit-reveal pattern)
 * @param hash keccak256(abi.encodePacked(guess, salt))
 */
function commitGuess(bytes32 hash) external nonReentrant {
    // must be in the computed COMMIT window
    require(getPhase() == GamePhase.COMMIT_PHASE, "Not commit phase");

    Player storage p = players[msg.sender];
    require(p.hasJoined,      "Not joined");
    require(!p.hasCommitted,  "Already committed");

    p.commitment   = hash;
    p.hasCommitted = true;
    emit GuessCommitted(msg.sender);
}


function revealGuess(uint256 guess, bytes32 salt) external nonReentrant {
    // must be inside the computed REVEAL window
    require(getPhase() == GamePhase.REVEAL_PHASE, "Not reveal phase");

    Player storage p = players[msg.sender];
    require(p.hasJoined && p.hasCommitted, "No commit");
    require(!p.hasRevealed,               "Already revealed");
    require(
        keccak256(abi.encodePacked(guess, salt)) == p.commitment,
        "Invalid reveal"
    );

    p.revealedGuess = guess;
    p.hasRevealed   = true;
    emit GuessRevealed(msg.sender, guess);
}

/// @dev Finalize the game once the reveal window has closed
function finalizeGame() external nonReentrant {
    // only callable when our view flips to EVALUATING_RESULTS
    require(getPhase() == GamePhase.EVALUATING_RESULTS, "Not finalizable");
    _calculateResults();
}


    /**
     * @dev Core game logic: Calculate 2/3 average and determine winner
     * 
     * ALGORITHM:
     * 1. Sum all revealed guesses (unrevealed = forfeit)
     * 2. Calculate average = sum / count
     * 3. Calculate target = (average * 2) / 3
     * 4. Find player(s) closest to target
     * 5. If tie, use pseudo-random selection
     * 
     * EDGE CASES:
     * - No reveals: Owner gets prize pool (game failed)
     * - Multiple closest: Random selection using block data
     * 
     * PAYOUTS:
     * - Winner gets (100% - service fee) of prize pool
     * - Owner gets service fee percentage
     */
function _calculateResults() internal {
    uint256 sum;
    uint256 count;
    uint256 n = playerAddresses.length;

    // sum all revealed guesses
    for (uint256 i = 0; i < n; i++) {
        Player storage p = players[playerAddresses[i]];
        if (p.hasRevealed) {
            sum += p.revealedGuess;
            count++;
        }
    }

    // no reveals -> owner takes entire pool
    if (count == 0) {
        pendingWithdrawals[owner()] += prizePool;
        winner           = owner();
        average          = 0;
        twoThirdsAverage = 0;
        currentPhase     = GamePhase.GAME_ENDED;
        emit GameEnded(0, 0, winner, prizePool);
        return;
    }

    // compute average and target
    average          = sum / count;
    twoThirdsAverage = (average * 2) / 3;

    // find all players closest to target
    uint256 closest = type(uint256).max;
    address[] memory tied = new address[](count);
    uint256 tieCount;
    for (uint256 i = 0; i < n; i++) {
        Player storage p = players[playerAddresses[i]];
        if (p.hasRevealed) {
            uint256 diff = p.revealedGuess > twoThirdsAverage
                ? p.revealedGuess - twoThirdsAverage
                : twoThirdsAverage - p.revealedGuess;

            if (diff < closest) {
                closest  = diff;
                tieCount = 0;
                tied[tieCount++] = playerAddresses[i];
            } else if (diff == closest) {
                tied[tieCount++] = playerAddresses[i];
            }
        }
    }

    // pick winner (random tiebreak if needed)
    if (tieCount == 1) {
        winner = tied[0];
    } else {
        uint256 idx = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, tieCount))
        ) % tieCount;
        winner = tied[idx];
    }

    // distribute prize and service fee
    uint256 serviceFee = (prizePool * serviceFeePercent) / 100;
    uint256 winPrize   = prizePool - serviceFee;
    pendingWithdrawals[owner()] += serviceFee;
    pendingWithdrawals[winner]  += winPrize;

    // mark game ended and emit
    currentPhase = GamePhase.GAME_ENDED;
    emit GameEnded(average, twoThirdsAverage, winner, winPrize);
}


/// @dev Pull-over-push withdrawal
function withdraw() external nonReentrant {
    uint256 amt = pendingWithdrawals[msg.sender];
    require(amt > 0, "No funds");
    pendingWithdrawals[msg.sender] = 0;
    (bool ok, ) = payable(msg.sender).call{value: amt}("");
    require(ok, "Withdraw failed");
    emit Withdrawal(msg.sender, amt);
}

/// @dev Only leave while still in WAITING_FOR_PLAYERS
function leaveGame() external nonReentrant {
    require(getPhase() == GamePhase.WAITING_FOR_PLAYERS, "Too late to leave");
    require(players[msg.sender].hasJoined, "Not joined");

    players[msg.sender].hasJoined = false;
    prizePool                     -= entryFee;
    pendingWithdrawals[msg.sender] += entryFee;

    // remove from array
    uint256 idx;
    for (uint256 i = 0; i < playerAddresses.length; i++) {
        if (playerAddresses[i] == msg.sender) {
            idx = i;
            break;
        }
    }
    playerAddresses[idx] = playerAddresses[playerAddresses.length - 1];
    playerAddresses.pop();

    emit Withdrawal(msg.sender, entryFee);
}

/// @dev Seconds left in the current phase, derived from timestamps
function getTimeRemaining() external view returns (uint256) {
    uint256 now_ = block.timestamp;

    // still gathering players?
    if (playerAddresses.length < minPlayers) {
        return 0;
    }

    uint256 start       = minPlayersReachedTime;
    uint256 commitStart = start + autoStartDelay;
    uint256 commitEnd   = commitStart + commitDuration;
    uint256 revealEnd   = commitEnd + revealDuration;

    if (now_ < commitStart) {
        return commitStart - now_;
    } else if (now_ < commitEnd) {
        return commitEnd - now_;
    } else if (now_ < revealEnd) {
        return revealEnd - now_;
    } else {
        return 0;
    }
}

/// @dev Compute the current phase, with a terminal GAME_ENDED check first
function getPhase() public view returns (GamePhase) {
    // 1) If we’ve already finalized, stay ended
    if (currentPhase == GamePhase.GAME_ENDED) {
        return GamePhase.GAME_ENDED;
    }

    // 2) If not ended yet, derive from timestamps
    if (playerAddresses.length < minPlayers) {
        return GamePhase.WAITING_FOR_PLAYERS;
    }

    uint256 start       = minPlayersReachedTime;
    uint256 commitStart = start + autoStartDelay;
    uint256 commitEnd   = commitStart + commitDuration;
    uint256 revealEnd   = commitEnd + revealDuration;

    if (block.timestamp < commitStart) {
        return GamePhase.GAME_STARTING;
    } else if (block.timestamp < commitEnd) {
        return GamePhase.COMMIT_PHASE;
    } else if (block.timestamp < revealEnd) {
        return GamePhase.REVEAL_PHASE;
    } else {
        // once past reveal window, you must call finalizeGame() which sets
        // currentPhase to GAME_ENDED; until then, show EVALUATING_RESULTS
        return GamePhase.EVALUATING_RESULTS;
    }
}

/// @notice How many players have joined so far
function getPlayerCount() external view returns (uint256) {
    return playerAddresses.length;
}

/// @notice List all joined players
function getPlayers() external view returns (address[] memory) {
    return playerAddresses;
}

/// @dev Struct to hold pulled‐only results
struct Results {
    uint256 average;
    uint256 twoThirdsAverage;
    address winner;
    uint256 prize;      // winner’s net, not including service fee
    uint256 serviceFee; // contract owner’s cut
}

/// @notice Compute game results without any state changes
function getResults() external view returns (Results memory r) {
    uint256 sum;
    uint256 count;
    uint256 n = playerAddresses.length;

    // sum all revealed guesses
    for (uint256 i = 0; i < n; i++) {
        Player storage p = players[playerAddresses[i]];
        if (p.hasRevealed) {
            sum += p.revealedGuess;
            count++;
        }
    }

    // no reveals -> owner takes entire pool
    if (count == 0) {
        r.average           = 0;
        r.twoThirdsAverage  = 0;
        r.winner            = owner();
        r.prize             = prizePool;
        r.serviceFee        = 0;
        return r;
    }

    // compute average and target
    r.average          = sum / count;
    r.twoThirdsAverage = (r.average * 2) / 3;

    // find closest
    uint256 closest = type(uint256).max;
    address[] memory tied = new address[](count);
    uint256 tieCount;
    for (uint256 i = 0; i < n; i++) {
        Player storage p = players[playerAddresses[i]];
        if (!p.hasRevealed) continue;
        uint256 diff = p.revealedGuess > r.twoThirdsAverage
            ? p.revealedGuess - r.twoThirdsAverage
            : r.twoThirdsAverage - p.revealedGuess;
        if (diff < closest) {
            closest = diff;
            tieCount = 0;
            tied[tieCount++] = playerAddresses[i];
        } else if (diff == closest) {
            tied[tieCount++] = playerAddresses[i];
        }
    }

    // pick winner (random tiebreak if needed)
    if (tieCount == 1) {
        r.winner = tied[0];
    } else {
        uint256 idx = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, tieCount))
        ) % tieCount;
        r.winner = tied[idx];
    }

    // prize split
    uint256 service = (prizePool * serviceFeePercent) / 100;
    uint256 winnerCut = prizePool - service;
    r.prize      = winnerCut;
    r.serviceFee = service;
    return r;
}


}