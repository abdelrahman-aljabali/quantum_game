// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TwoThirdsAverageGame
 * @dev Implementation of the classic 2/3 Average Game on blockchain, optimized for gas.
 *
 * GAME THEORY:
 * - Each player privately chooses a number in the range [0, 1000].
 * - Once all players reveal, compute the average of all revealed numbers (integer division).
 * - The target is 2/3 of that average (again truncated to an integer).
 * - The winner is the player whose guess is closest to the 2/3‐average. In case of a tie,
 *   a pseudo‐random tie‐breaker (using block.timestamp and block.prevrandao) selects one.
 *
 * GAME FLOW:
 * 1. WAITING_FOR_PLAYERS: Players join by paying the entry fee. Minimum and maximum player counts enforced.
 * 2. GAME_STARTING: Once minPlayers is reached, a grace period (autoStartDelay) begins to allow last‐minute joins.
 * 3. COMMIT_PHASE: Players submit a hash of (guess || salt) to commit their guess without revealing it.
 * 4. REVEAL_PHASE: Players reveal their original guess and salt, which must match the earlier commitment.
 * 5. EVALUATING_RESULTS: Once reveal window closes, anyone can call finalizeGame() to compute the winner.
 * 6. GAME_ENDED: Winner and service‐fee recipient can withdraw their ETH; no further game actions allowed.
 *
 * SECURITY:
 * - Commit‐reveal prevents front‐running of guesses.
 * - ReentrancyGuard + pull‐over‐push withdrawal pattern prevent reentrancy/DoS attacks.
 * - Ownable grants administrative control (e.g., in a zero‐reveal scenario, owner takes the pot).
 *
 * GAS OPTIMIZATIONS:
 * - Uses _runningSum and _runningCount to accumulate revealed guesses, avoiding an O(n) loop just to sum.
 * - Caches playerAddresses.length before loops in finalizeGame() to avoid repeated SLOADs.
 * - Packs Player struct tightly so it consumes only two storage slots.
 * - O(1) removal pattern in leaveGame() to refund pre‐game leavers.
 */
contract TwoThirdsAverageGame is Ownable, ReentrancyGuard {
    // === GAME CONFIGURATION ===

    /// @notice Minimum number of players required to start the game (must be ≥ 3)
    uint256 public minPlayers;

    /// @notice Maximum number of players allowed in a single game
    uint256 public maxPlayers;

    /// @notice Duration (in seconds) of the commit phase (players submit hashed guesses)
    uint256 public commitDuration;

    /// @notice Duration (in seconds) of the reveal phase (players reveal their guesses)
    uint256 public revealDuration;

    /// @notice Entry fee each player must pay to join
    uint256 public entryFee;

    /// @notice Platform service fee percentage (must be ≤ 20). Winner receives (100 - serviceFeePercent)% of pot.
    uint256 public serviceFeePercent;

    /// @notice Delay (in seconds) after minPlayers reached before commit phase begins (grace period)
    uint256 public autoStartDelay;

    /**
     * @dev Enumeration of the various phases of the game.
     */
    enum GamePhase {
        WAITING_FOR_PLAYERS,  // Players may join
        GAME_STARTING,        // minPlayers reached, waiting autoStartDelay
        COMMIT_PHASE,         // Players commit by submitting hash(guess || salt)
        REVEAL_PHASE,         // Players reveal guess + salt
        EVALUATING_RESULTS,   // Reveal window closed; finalizeGame() can be called
        GAME_ENDED            // Game has concluded; winner can withdraw
    }

    /// @notice Current phase of the game; updated as time advances and actions occur
    GamePhase public currentPhase;

    // === TIMING SYSTEM ===

    /// @notice Timestamp (in seconds since epoch) when minPlayers was first reached (used to schedule phases)
    uint256 public minPlayersReachedTime;

    // === PLAYER DATA ===

    /**
     * @dev Struct to hold each player's data.
     * @param commitment   keccak256 hash of (guess || salt), set during commit phase
     * @param revealedGuess The actual guess (0–1000) after reveal; stored as uint16
     * @param hasCommitted  Whether the player submitted a commitment
     * @param hasRevealed   Whether the player has revealed their guess
     * @param hasJoined     Whether the player has joined the game
     */
    struct Player {
        bytes32 commitment;
        uint16  revealedGuess;
        bool    hasCommitted;
        bool    hasRevealed;
        bool    hasJoined;
    }

    /// @notice Mapping from player address to their Player struct
    mapping(address => Player) public players;

    /// @notice Array of all player addresses who have joined (for enumeration)
    address[] public playerAddresses;

    /// @notice Mapping to track each player's index in playerAddresses[] for O(1) removal
    mapping(address => uint256) private playerIndex;

    // === ACCUMULATED REVEAL STATS ===

    /// @dev Running sum of all revealed guesses (to avoid a separate summation loop)
    uint256 private _runningSum;

    /// @dev Running count of total reveals (to compute average on the fly)
    uint256 private _runningCount;

    // === GAME RESULTS ===

    /// @notice Final integer average of all revealed guesses (sum / count)
    uint16 public average;

    /// @notice Final 2/3‐average computed as floor((average * 2) / 3)
    uint16 public twoThirdsAverage;

    /// @notice Address of the winner (closest guess to twoThirdsAverage)
    address public winner;

    /// @notice Total ETH in the prize pool (accumulates entry fees)
    uint256 public prizePool;

    // === WITHDRAWAL SYSTEM (PULL‐OVER‐PUSH) ===

    /// @notice Mapping of addresses to their withdrawable ETH balances
    mapping(address => uint256) public pendingWithdrawals;

    // === EVENTS ===

    /// @notice Emitted whenever a player successfully joins and pays the entry fee
    event PlayerJoined(address indexed player, uint256 entryFeePaid);

    /**
     * @notice Emitted when the game transitions from WAITING_FOR_PLAYERS → GAME_STARTING.
     * @param startTime   Timestamp when the minimum number of players was reached
     * @param commitStart Timestamp when the commit phase will begin (startTime + autoStartDelay)
     * @param commitEnd   Timestamp when the commit phase will end (commitStart + commitDuration)
     * @param entryFee    The entry fee each player must pay
     * @param minPlayers  Minimum players required to start
     * @param maxPlayers  Maximum players allowed
     */
    event GameStarting(
        uint256 startTime,
        uint256 commitStart,
        uint256 commitEnd,
        uint256 entryFee,
        uint256 minPlayers,
        uint256 maxPlayers
    );

    /// @notice Emitted when a player submits their commitment (hash of guess||salt)
    event GuessCommitted(address indexed player);

    /// @notice Emitted when a player reveals their guess successfully
    event GuessRevealed(address indexed player, uint256 guess);

    /**
     * @notice Emitted when the game ends and winner is determined.
     * @param average            Final average of revealed guesses (integer)
     * @param twoThirdsAverage   Final two‐thirds average computed
     * @param winner             Address of the winning player
     * @param prize              Net prize amount awarded to the winner (after service fee)
     */
    event GameEnded(
        uint16 average,
        uint16 twoThirdsAverage,
        address winner,
        uint256 prize
    );

    /// @notice Emitted whenever a withdrawal is made (for refunds or prize/service fees)
    event Withdrawal(address indexed recipient, uint256 amount);

    // === CONSTRUCTOR ===

    /**
     * @dev Constructor initializes all game configuration parameters.
     * Sets the initial phase to WAITING_FOR_PLAYERS.
     * @param _minPlayers        Minimum number of players to begin (must be ≥ 3)
     * @param _maxPlayers        Maximum number of players allowed (must be > _minPlayers)
     * @param _commitDuration    Duration of the commit phase, in seconds (must be > 0)
     * @param _revealDuration    Duration of the reveal phase, in seconds (must be > 0)
     * @param _entryFee          Entry fee (in wei) each player must pay to join
     * @param _serviceFeePercent Platform service fee percentage (0–20)
     * @param _autoStartDelay    Delay (in seconds) after minPlayers reached before commit begins (must be > 0)
     */
    constructor(
        uint256 _minPlayers,
        uint256 _maxPlayers,
        uint256 _commitDuration,
        uint256 _revealDuration,
        uint256 _entryFee,
        uint256 _serviceFeePercent,
        uint256 _autoStartDelay
    ) Ownable(msg.sender) {
        // Validate constructor arguments
        require(_minPlayers >= 3, "Min players >= 3");
        require(_maxPlayers > _minPlayers, "Max > min");
        require(_commitDuration > 0, "Commit dur > 0");
        require(_revealDuration > 0, "Reveal dur > 0");
        require(_autoStartDelay > 0, "Delay > 0");
        require(_serviceFeePercent <= 20, "Fee <= 20%");

        // Set configuration
        minPlayers        = _minPlayers;
        maxPlayers        = _maxPlayers;
        commitDuration    = _commitDuration;
        revealDuration    = _revealDuration;
        entryFee          = _entryFee;
        serviceFeePercent = _serviceFeePercent;
        autoStartDelay    = _autoStartDelay;

        // Initially, no players have joined; game is waiting for players
        currentPhase      = GamePhase.WAITING_FOR_PLAYERS;
    }

    // === CORE GAME FUNCTIONS ===

    /**
     * @dev Allows a player to join the game by paying the exact `entryFee`.
     *      Must be called while in WAITING_FOR_PLAYERS or within the grace period in GAME_STARTING.
     *      Once `minPlayers` is reached for the first time, the `minPlayersReachedTime` is set
     *      and the phase transitions to GAME_STARTING. After `autoStartDelay` passes, commit phase begins.
     *
     * Requirements:
     * - Current phase (via getPhase()) must be WAITING_FOR_PLAYERS or GAME_STARTING (and within `autoStartDelay`).
     * - Total joined players (`playerAddresses.length`) must be < `maxPlayers`.
     * - Caller must not have already joined.
     * - msg.value must exactly equal `entryFee`.
     *
     * Effects:
     * - Records the new player in `players[msg.sender]`.
     * - Adds address to `playerAddresses` & `playerIndex`.
     * - Increases `prizePool` by `msg.value`.
     * - Emits {PlayerJoined}.
     * - If this join triggers `minPlayers` for the first time, sets `minPlayersReachedTime`,
     *   transitions to GAME_STARTING, and emits {GameStarting}.
     */
    function joinGame() external payable nonReentrant {
        GamePhase phase = getPhase();
        require(
            phase == GamePhase.WAITING_FOR_PLAYERS ||
            phase == GamePhase.GAME_STARTING,
            "Cannot join now"
        );

        // If already in GAME_STARTING, ensure the grace period is not over
        if (
            phase == GamePhase.GAME_STARTING &&
            block.timestamp >= minPlayersReachedTime + autoStartDelay
        ) {
            revert("Join window closed");
        }

        // Ensure there is room and the caller hasn't joined yet
        require(playerAddresses.length < maxPlayers, "Game full");
        require(!players[msg.sender].hasJoined, "Already joined");
        require(msg.value == entryFee, "Incorrect entry fee");

        // Record the player data
        players[msg.sender] = Player({
            commitment:    bytes32(0),
            revealedGuess: 0,
            hasCommitted:  false,
            hasRevealed:   false,
            hasJoined:     true
        });
        playerIndex[msg.sender] = playerAddresses.length;
        playerAddresses.push(msg.sender);
        prizePool += msg.value;
        emit PlayerJoined(msg.sender, msg.value);

        // If the number of joined players has just reached minPlayers for the first time
        if (
            playerAddresses.length >= minPlayers &&
            minPlayersReachedTime == 0
        ) {
            // Lock in the time and move to GAME_STARTING
            minPlayersReachedTime = block.timestamp;
            currentPhase = GamePhase.GAME_STARTING;
            emit GameStarting(
                minPlayersReachedTime,
                minPlayersReachedTime + autoStartDelay,                  // commitStart
                minPlayersReachedTime + autoStartDelay + commitDuration, // commitEnd
                entryFee,
                minPlayers,
                maxPlayers
            );
        }
    }

    /**
     * @dev Players submit their commitment (hash of guess || salt) during the COMMIT_PHASE.
     *
     * Requirements:
     * - Current phase (via getPhase()) must be COMMIT_PHASE.
     * - Caller must have joined (players[msg.sender].hasJoined == true).
     * - Caller must not have already committed (players[msg.sender].hasCommitted == false).
     *
     * Effects:
     * - Stores `hash` in `players[msg.sender].commitment`.
     * - Marks `players[msg.sender].hasCommitted = true`.
     * - Emits {GuessCommitted}.
     */
    function commitGuess(bytes32 hash) external nonReentrant {
        require(getPhase() == GamePhase.COMMIT_PHASE, "Not commit phase");
        Player storage p = players[msg.sender];
        require(p.hasJoined, "Not a player");
        require(!p.hasCommitted, "Already committed");

        p.commitment   = hash;
        p.hasCommitted = true;
        emit GuessCommitted(msg.sender);
    }

    /**
     * @dev Players reveal their guess and salt during the REVEAL_PHASE.
     *      Must match the previously submitted commitment: keccak256(abi.encodePacked(guess, salt)).
     *      Updates `_runningSum` and `_runningCount` so that finalizeGame() can compute averages in O(1).
     *
     * Requirements:
     * - Current phase must be REVEAL_PHASE.
     * - Caller must have joined and already committed.
     * - Caller must not have already revealed.
     * - keccak256(abi.encodePacked(guess, salt)) must equal `players[msg.sender].commitment`.
     *
     * Effects:
     * - Stores `uint16(guess)` in `players[msg.sender].revealedGuess`.
     * - Marks `players[msg.sender].hasRevealed = true`.
     * - Increments `_runningSum` by `guess` and `_runningCount` by 1.
     * - Emits {GuessRevealed}.
     *
     * @param guess The original guess (0 ≤ guess ≤ 1000).
     * @param salt  The secret salt used during commitment.
     */
    function revealGuess(uint256 guess, bytes32 salt) external nonReentrant {
        require(getPhase() == GamePhase.REVEAL_PHASE, "Not reveal phase");
        Player storage p = players[msg.sender];
        require(p.hasJoined && p.hasCommitted, "No commit found");
        require(!p.hasRevealed, "Already revealed");
        require(
            keccak256(abi.encodePacked(guess, salt)) == p.commitment,
            "Invalid reveal"
        );

        // Record the revealed guess (shrink to uint16 for storage)
        p.revealedGuess = uint16(guess);
        p.hasRevealed   = true;
        _runningSum     += guess;
        _runningCount   += 1;

        emit GuessRevealed(msg.sender, guess);
    }

    /**
     * @dev Finalizes the game after REVEAL_PHASE ends. Anyone can call.
     *      Computes the integer average of all revealed guesses, then 2/3 of that average.
     *      Finds the player(s) whose guess is closest to that target. If multiple players tie,
     *      selects one via a pseudo‐random tie‐breaker. Distributes prize minus service fee.
     *
     * Requirements:
     * - Current phase (via getPhase()) must be EVALUATING_RESULTS.
     *
     * Effects:
     * - If `_runningCount == 0` (no one revealed):
     *     • Owner takes all ETH in `prizePool`.
     *     • Sets `winner = owner()`, `average = 0`, `twoThirdsAverage = 0`.
     *     • Marks `currentPhase = GAME_ENDED`, emits {GameEnded}.
     * - Else:
     *     • Computes `avg = uint16(_runningSum / _runningCount)`.
     *     • Computes `two3 = uint16((avg * 2) / 3)`.
     *     • Iterates over `playerAddresses` (cached length in local `n`) to find the minimum absolute difference
     *       between each `p.revealedGuess` and `two3`. Builds a memory array `tied[]` of all players who achieve
     *       the same bestDiff. Uses `keccak256(abi.encodePacked(block.timestamp, block.prevrandao, tieCount))`
     *       modulo `tieCount` to select one winner if there is a tie.
     *     • Calculates `serviceFee = (prizePool * serviceFeePercent) / 100`.
     *     • Winner gets `prizePool - serviceFee`, owner gets `serviceFee`, stored in `pendingWithdrawals`.
     *     • Updates `average`, `twoThirdsAverage`, `winner`, `currentPhase = GAME_ENDED`.
     *     • Emits {GameEnded}.
     */
    function finalizeGame() external nonReentrant {
        require(getPhase() == GamePhase.EVALUATING_RESULTS, "Not finalizable");

        uint256 sum   = _runningSum;
        uint256 count = _runningCount;

        // Case: no reveals → owner takes all
        if (count == 0) {
            pendingWithdrawals[owner()] += prizePool;
            winner                      = owner();
            average                     = 0;
            twoThirdsAverage            = 0;
            currentPhase                = GamePhase.GAME_ENDED;
            emit GameEnded(0, 0, winner, prizePool);
            return;
        }

        // 1. Compute integer average of revealed guesses
        uint16 avg = uint16(sum / count);
        average = avg;

        // 2. Compute two‐thirds average = floor((avg * 2) / 3)
        uint16 two3 = uint16((uint256(avg) * 2) / 3);
        twoThirdsAverage = two3;

        // 3. Find player(s) whose guess is closest to two3
        uint16 bestDiff = type(uint16).max;
        address[] memory tied = new address[](count); // memory array capped at `count`
        uint256 tieCount = 0;

        // Cache playerAddresses.length to avoid repeated SLOADs
        uint256 n = playerAddresses.length;
        for (uint256 i = 0; i < n; i++) {
            address addr = playerAddresses[i];
            Player storage p = players[addr];

            // Skip players who never revealed
            if (!p.hasRevealed) {
                continue;
            }

            uint16 guess = p.revealedGuess;
            // Absolute difference to two3
            uint16 diff = guess > two3 ? (guess - two3) : (two3 - guess);

            if (diff < bestDiff) {
                // Found a new best distance
                bestDiff = diff;
                tieCount = 0;
                tied[tieCount++] = addr;
            } else if (diff == bestDiff) {
                // Found another player matching the same best distance
                tied[tieCount++] = addr;
            }
        }

        // 4. Resolve tie if needed
        if (tieCount == 1) {
            winner = tied[0];
        } else {
            // Pseudo‐random selection among tied players
            uint256 idx = uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.prevrandao,
                        tieCount
                    )
                )
            ) % tieCount;
            winner = tied[idx];
        }

        // 5. Distribute prize minus service fee
        uint256 serviceFee = (prizePool * serviceFeePercent) / 100;
        uint256 winPrize   = prizePool - serviceFee;

        // Record pending withdrawals for owner and winner
        pendingWithdrawals[owner()] += serviceFee;
        pendingWithdrawals[winner]  += winPrize;

        // 6. Mark game as ended
        currentPhase = GamePhase.GAME_ENDED;
        emit GameEnded(avg, two3, winner, winPrize);
    }

    /**
     * @dev Pull‐over‐push withdrawal pattern. Anyone with a nonzero pending withdrawal balance
     *      can call this to receive their ETH (refunds, winnings, or service fee).
     *
     * Requirements:
     * - pendingWithdrawals[msg.sender] must be > 0.
     *
     * Effects:
     * - Captures `amt = pendingWithdrawals[msg.sender]`, sets it to 0, and transfers `amt` to msg.sender.
     * - Emits {Withdrawal}.
     */
    function withdraw() external nonReentrant {
        uint256 amt = pendingWithdrawals[msg.sender];
        require(amt > 0, "No funds to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amt}("");
        require(ok, "Transfer failed");
        emit Withdrawal(msg.sender, amt);
    }

    /**
     * @dev Allows a player to leave the game before it officially starts (only in WAITING_FOR_PLAYERS).
     *      Player is fully refunded the entry fee via pendingWithdrawals.
     *      Uses O(1) removal from the playerAddresses array by swapping with the last element.
     *
     * Requirements:
     * - Current phase (via getPhase()) must be WAITING_FOR_PLAYERS.
     * - Caller must have joined (players[msg.sender].hasJoined == true).
     *
     * Effects:
     * - Removes the player’s address from playerAddresses (swap & pop).
     * - Refunds entryFee by adding to pendingWithdrawals[msg.sender].
     * - Decrements prizePool by entryFee.
     * - Deletes players[msg.sender] to clear storage and receive gas refund.
     * - Emits {Withdrawal} with the refunded amount.
     */
    function leaveGame() external nonReentrant {
        require(getPhase() == GamePhase.WAITING_FOR_PLAYERS, "Cannot leave now");
        Player storage p = players[msg.sender];
        require(p.hasJoined, "Not joined");

        // Remove from playerAddresses in O(1)
        uint256 idx = playerIndex[msg.sender];
        uint256 lastIdx = playerAddresses.length - 1;
        address lastPlayer = playerAddresses[lastIdx];
        playerAddresses[idx] = lastPlayer;
        playerIndex[lastPlayer] = idx;
        playerAddresses.pop();
        delete playerIndex[msg.sender];

        // Refund entry fee
        prizePool -= entryFee;
        pendingWithdrawals[msg.sender] += entryFee;

        // Clear the player’s record (storage refund)
        delete players[msg.sender];

        emit Withdrawal(msg.sender, entryFee);
    }

    // === VIEW FUNCTIONS & HELPERS ===

    /**
     * @dev Returns the number of seconds remaining in the current phase (commit or reveal).
     *      If below `minPlayers` or past reveal window, returns 0.
     *
     * Calculation:
     *   start         = minPlayersReachedTime
     *   commitStart   = start + autoStartDelay
     *   commitEnd     = commitStart + commitDuration
     *   revealEnd     = commitEnd + revealDuration
     *
     *   If now < commitStart: sec = commitStart - now
     *   Else if now < commitEnd: sec = commitEnd - now
     *   Else if now < revealEnd: sec = revealEnd - now
     *   Else: sec = 0
     *
     * @return Number of seconds remaining in the current commit or reveal window.
     */
    function getTimeRemaining() external view returns (uint256) {
        uint256 now_ = block.timestamp;
        if (playerAddresses.length < minPlayers) {
            return 0;
        }

        uint256 start = minPlayersReachedTime;
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

    /**
     * @dev Computes the current `GamePhase` based on timestamps and internal state.
     *      This function does not modify state (view).
     *
     * Logic:
     *   If currentPhase == GAME_ENDED → return GAME_ENDED.
     *   If playerAddresses.length < minPlayers → return WAITING_FOR_PLAYERS.
     *   Otherwise:
     *     commitStart = minPlayersReachedTime + autoStartDelay
     *     commitEnd   = commitStart + commitDuration
     *     revealEnd   = commitEnd + revealDuration
     *
     *     If now < commitStart → GAME_STARTING
     *     Else If now < commitEnd → COMMIT_PHASE
     *     Else If now < revealEnd → REVEAL_PHASE
     *     Else → EVALUATING_RESULTS
     *
     * @return The current phase of the game.
     */
    function getPhase() public view returns (GamePhase) {
        // Once game is ended, it remains ended
        if (currentPhase == GamePhase.GAME_ENDED) {
            return GamePhase.GAME_ENDED;
        }
        // If not enough players yet, still waiting
        if (playerAddresses.length < minPlayers) {
            return GamePhase.WAITING_FOR_PLAYERS;
        }

        uint256 start = minPlayersReachedTime;
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
            // After reveal window but before finalization
            return GamePhase.EVALUATING_RESULTS;
        }
    }

    /**
     * @dev Returns the number of players who have joined.
     * @return Length of the `playerAddresses` array.
     */
    function getPlayerCount() external view returns (uint256) {
        return playerAddresses.length;
    }

    /**
     * @dev Returns the full list of addresses that have joined.
     * @return Array of player addresses.
     */
    function getPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }

    /**
     * @dev Struct for returning game results off-chain.
     *      Contains computed averages, winner address, winner’s prize, and service fee.
     */
    struct Results {
        uint16 average;
        uint16 twoThirdsAverage;
        address winner;
        uint256 prize;      // Winner’s net prize (excluding service fee)
        uint256 serviceFee; // Service fee owed to owner
    }

    /**
     * @dev Computes game results off‐chain (view only, no state changes).
     *      WARNING: Loops over all players in memory; use only off-chain or in non-gas‐sensitive contexts.
     *
     * Steps (mirrors finalizeGame logic):
     *   1. Sum all revealed guesses and count them.
     *   2. If count == 0 → winner = owner, prize = prizePool, serviceFee = 0, average = twoThirds = 0.
     *   3. Else compute avg = uint16(sum / count), two3 = uint16((avg * 2) / 3).
     *   4. Identify all players whose revealedGuess differs from two3 by the minimal amount, collect them in `tied[]`.
     *   5. If tieCountLocal == 1 → that player is winner. Else → pseudo‐random tiebreaker among `tied[]`.
     *   6. Compute serviceFee = (prizePool * serviceFeePercent) / 100, winCut = prizePool - serviceFee.
     *
     * @return r A Results struct with fields:
     *   - average: integer average of revealed guesses
     *   - twoThirdsAverage: computed target
     *   - winner: address of chosen winner
     *   - prize: winner’s net amount (prizePool - serviceFee)
     *   - serviceFee: owner’s cut
     */
    function getResults() external view returns (Results memory r) {
        uint256 sum;
        uint256 count;
        uint256 n = playerAddresses.length;

        // 1. Sum and count all revealed guesses
        for (uint256 i = 0; i < n; i++) {
            Player storage p = players[playerAddresses[i]];
            if (p.hasRevealed) {
                sum += p.revealedGuess;
                count++;
            }
        }

        // 2. If no reveals, owner takes entire pot
        if (count == 0) {
            r.average          = 0;
            r.twoThirdsAverage = 0;
            r.winner           = owner();
            r.prize            = prizePool;
            r.serviceFee       = 0;
            return r;
        }

        // 3. Compute integer averages
        uint16 avg = uint16(sum / count);
        r.average = avg;
        uint16 two3 = uint16((uint256(avg) * 2) / 3);
        r.twoThirdsAverage = two3;

        // 4. Identify closest guesses
        uint256 closest = type(uint256).max;
        address[] memory tied = new address[](count);
        uint256 tieCountLocal;

        for (uint256 i = 0; i < n; i++) {
            Player storage p = players[playerAddresses[i]];
            if (!p.hasRevealed) continue;
            uint16 guess = p.revealedGuess;
            uint256 diff = guess > two3 ? (guess - two3) : (two3 - guess);
            if (diff < closest) {
                closest = diff;
                tieCountLocal = 0;
                tied[tieCountLocal++] = playerAddresses[i];
            } else if (diff == closest) {
                tied[tieCountLocal++] = playerAddresses[i];
            }
        }

        // 5. Resolve tie in view mode (pseudo-random based on current block data)
        if (tieCountLocal == 1) {
            r.winner = tied[0];
        } else {
            uint256 idx = uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.prevrandao,
                        tieCountLocal
                    )
                )
            ) % tieCountLocal;
            r.winner = tied[idx];
        }

        // 6. Compute prize splits
        uint256 service = (prizePool * serviceFeePercent) / 100;
        uint256 winCut  = prizePool - service;
        r.prize      = winCut;
        r.serviceFee = service;
        return r;
    }
}
