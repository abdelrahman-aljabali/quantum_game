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

    /**
     * @dev Game phases following the natural flow of the 2/3 average game
     * WAITING_FOR_PLAYERS: Initial state, accepting new players
     * GAME_STARTING: Min players reached, countdown to start
     * COMMIT_PHASE: Players submit encrypted guesses
     * REVEAL_PHASE: Players reveal their original guesses
     * EVALUATING_RESULTS: Contract calculates winner
     * GAME_ENDED: Winner determined, withdrawals available
     */
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
    mapping(GamePhase => uint256) public phaseStartTime; // Track when each phase began
    uint256 public minPlayersReachedTime;                // When quorum was first reached
    uint256 public commitEndTime;                        // When commit phase ends
    uint256 public revealEndTime;                        // When reveal phase ends

    /**
     * @dev Player data structure for commit-reveal pattern
     * commitment: keccak256(guess, salt) - hidden until reveal
     * revealedGuess: Original number (0-1000) revealed in phase 2
     * hasCommitted: Prevents double-committing
     * hasRevealed: Prevents double-revealing
     * hasJoined: Tracks game participation
     */
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
    event CommitPhaseStarted(uint256 startTime, uint256 endTime);
    event RevealPhaseStarted(uint256 startTime, uint256 endTime);
    event GuessCommitted(address indexed player);
    event GuessRevealed(address indexed player, uint256 guess);
    event PhaseAdvanced(GamePhase from, GamePhase to, uint256 timestamp);
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

        currentPhase           = GamePhase.WAITING_FOR_PLAYERS;
        phaseStartTime[currentPhase] = block.timestamp;
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
    function joinGame() external payable nonReentrant {
        require(
            currentPhase == GamePhase.WAITING_FOR_PLAYERS ||
            currentPhase == GamePhase.GAME_STARTING,
            "Cannot join"
        );
        // No late joiners after window
        if (
            currentPhase == GamePhase.GAME_STARTING &&
            block.timestamp >= minPlayersReachedTime + autoStartDelay
        ) {
            revert("Join window closed");
        }
        require(playerAddresses.length < maxPlayers, "Game full");
        require(!players[msg.sender].hasJoined,   "Already joined");
        require(msg.value == entryFee,             "Wrong entry fee");

        // initialize player data
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

        // start game timer when quorum reached
        if (playerAddresses.length >= minPlayers && minPlayersReachedTime == 0) {
            minPlayersReachedTime = block.timestamp;
            currentPhase          = GamePhase.GAME_STARTING;
            phaseStartTime[currentPhase] = block.timestamp;
            emit GameStarting(
                block.timestamp,
                block.timestamp + autoStartDelay,
                block.timestamp + autoStartDelay + commitDuration,
                entryFee,
                minPlayers,
                maxPlayers
            );
        }
        // auto transition if delay passed
        if (
            currentPhase == GamePhase.GAME_STARTING &&
            block.timestamp >= minPlayersReachedTime + autoStartDelay
        ) {
            catchUp();
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
    function commitGuess(bytes32 hash) external nonReentrant {
        require(currentPhase == GamePhase.COMMIT_PHASE, "Not commit phase");
        require(block.timestamp < commitEndTime,         "Commit closed");
        Player storage p = players[msg.sender];
        require(p.hasJoined,                            "Not joined");
        require(!p.hasCommitted,                       "Already committed");

        p.commitment   = hash;
        p.hasCommitted = true;
        emit GuessCommitted(msg.sender);
    }

    /**
     * @dev Phase 2: Players reveal their original guesses to prove commitments
     * @param guess The original number (0-1000) from the commit phase
     * @param salt The random salt used in the commit hash
     * 
     * VERIFICATION:
     * Contract verifies: keccak256(guess, salt) == stored commitment
     * This proves the player didn't change their guess after seeing others
     * 
     * FORFEITURE:
     * Players who don't reveal forfeit their chance to win
     * (but their committed guess still counts toward the average)
     */
    function revealGuess(uint256 guess, bytes32 salt) external nonReentrant {
        require(currentPhase == GamePhase.REVEAL_PHASE, "Not reveal phase");
        require(block.timestamp < revealEndTime,         "Reveal closed");
        Player storage p = players[msg.sender];
        require(p.hasJoined && p.hasCommitted,          "No commit");
        require(!p.hasRevealed,                         "Already revealed");
        require(
            keccak256(abi.encodePacked(guess, salt)) == p.commitment,
            "Invalid reveal"
        );

        p.revealedGuess = guess;
        p.hasRevealed   = true;
        emit GuessRevealed(msg.sender, guess);
    }

    /** Catch up any pending phase transitions in one call */
    function catchUp() public nonReentrant {
        bool advanced;
        do {
            advanced = false;
            // STARTING -> COMMIT
            uint256 startDeadline = minPlayersReachedTime + autoStartDelay;
            if (
                currentPhase == GamePhase.GAME_STARTING &&
                block.timestamp >= startDeadline
            ) {
                currentPhase     = GamePhase.COMMIT_PHASE;
                phaseStartTime[currentPhase] = block.timestamp;
                commitEndTime    = block.timestamp + commitDuration;
                emit PhaseAdvanced(GamePhase.GAME_STARTING, GamePhase.COMMIT_PHASE, commitEndTime);
                advanced = true;
                continue;
            }
            // COMMIT -> REVEAL
            if (
                currentPhase == GamePhase.COMMIT_PHASE &&
                block.timestamp >= commitEndTime
            ) {
                currentPhase      = GamePhase.REVEAL_PHASE;
                phaseStartTime[currentPhase] = block.timestamp;
                revealEndTime     = block.timestamp + revealDuration;
                emit PhaseAdvanced(GamePhase.COMMIT_PHASE, GamePhase.REVEAL_PHASE, revealEndTime);
                advanced = true;
                continue;
            }
            // REVEAL -> EVALUATING
            if (
                currentPhase == GamePhase.REVEAL_PHASE &&
                block.timestamp >= revealEndTime
            ) {
                currentPhase = GamePhase.EVALUATING_RESULTS;
                emit PhaseAdvanced(GamePhase.REVEAL_PHASE, GamePhase.EVALUATING_RESULTS, block.timestamp);
                _calculateResults();
                advanced = true;
                continue;
            }
        } while (advanced);
    }

    /** Anyone can call finalize if reveal ended */
    function finalizeGame() external nonReentrant {
        require(currentPhase == GamePhase.REVEAL_PHASE, "Not reveal phase");
        require(block.timestamp >= revealEndTime,        "Reveal still open");
        catchUp();
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
        for (uint256 i = 0; i < n; i++) {
            Player storage p = players[playerAddresses[i]];
            if (p.hasRevealed) {
                sum += p.revealedGuess;
                count++;
            }
        }
        // no reveals -> owner gets everything
        if (count == 0) {
            pendingWithdrawals[owner()] += prizePool;
            winner = owner();
            average = 0;
            twoThirdsAverage = 0;
            currentPhase = GamePhase.GAME_ENDED;
            emit GameEnded(0, 0, owner(), prizePool);
            return;
        }
        average = sum / count;
        twoThirdsAverage = (average * 2) / 3;
        uint256 closest = type(uint256).max;
        address[] memory cont = new address[](count);
        uint256 c;
        for (uint256 i = 0; i < n; i++) {
            Player storage p = players[playerAddresses[i]];
            if (p.hasRevealed) {
                uint256 diff = p.revealedGuess > twoThirdsAverage
                    ? p.revealedGuess - twoThirdsAverage
                    : twoThirdsAverage - p.revealedGuess;
                if (diff < closest) {
                    closest = diff;
                    c = 0;
                    cont[c++] = playerAddresses[i];
                } else if (diff == closest) {
                    cont[c++] = playerAddresses[i];
                }
            }
        }
        if (c == 1) {
            winner = cont[0];
        } else {
            uint256 idx = uint256(
                keccak256(abi.encodePacked(block.timestamp, block.prevrandao, c))
            ) % c;
            winner = cont[idx];
        }
        currentPhase = GamePhase.GAME_ENDED;
        uint256 serviceFee = (prizePool * serviceFeePercent) / 100;
        uint256 winPrize   = prizePool - serviceFee;
        pendingWithdrawals[owner()] += serviceFee;
        pendingWithdrawals[winner]  += winPrize;
        emit GameEnded(average, twoThirdsAverage, winner, winPrize);
    }

    /** Pull-over-push withdrawal pattern */
    function withdraw() external nonReentrant {
        uint256 amt = pendingWithdrawals[msg.sender];
        require(amt > 0, "No funds");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amt}("");
        require(ok, "Withdraw failed");
        emit Withdrawal(msg.sender, amt);
    }

    function leaveGame() external nonReentrant {
    require(currentPhase == GamePhase.WAITING_FOR_PLAYERS, "Too late to leave");
    require(players[msg.sender].hasJoined, "Not joined");

    players[msg.sender].hasJoined = false;

    // Remove from prize pool
    prizePool -= entryFee;
    pendingWithdrawals[msg.sender] += entryFee;

    // Remove player address
    uint256 index;
    for (uint256 i = 0; i < playerAddresses.length; i++) {
        if (playerAddresses[i] == msg.sender) {
            index = i;
            break;
        }
    }
    playerAddresses[index] = playerAddresses[playerAddresses.length - 1];
    playerAddresses.pop();

    emit Withdrawal(msg.sender, entryFee);
}


    /** NEW: Returns how many seconds remain until the next phase deadline,
        based on the on‑chain timestamp we recorded at each phase start. */
    function getTimeRemaining() external view returns (uint256) {
        uint256 start = phaseStartTime[currentPhase];
        uint256 dur;
        if (currentPhase == GamePhase.GAME_STARTING) {
            dur = autoStartDelay;
        } else if (currentPhase == GamePhase.COMMIT_PHASE) {
            dur = commitDuration;
        } else if (currentPhase == GamePhase.REVEAL_PHASE) {
            dur = revealDuration;
        } else {
            return 0;
        }
        uint256 deadline = start + dur;
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }

    /** UI helpers */
    function getPhase() external view returns (GamePhase) {
        return currentPhase;
    }
    function getCommitEndTime() external view returns (uint256) {
        return commitEndTime;
    }
    function getRevealEndTime() external view returns (uint256) {
        return revealEndTime;
    }
    function getPlayerCount() external view returns (uint256) {
        return playerAddresses.length;
    }
    function getPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }
    function getPrizePool() external view returns (uint256) {
        return prizePool;
    }
    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }
}
