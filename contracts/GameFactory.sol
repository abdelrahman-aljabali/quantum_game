// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TwoThirdsAverageGame.sol";

/**
 * @title GameFactory
 * @dev Factory contract for deploying and managing TwoThirdsAverageGame instances
 * 
 * PURPOSE:
 * - Allows anyone to create new 2/3 average games with standard settings
 * - Maintains registry of all deployed games
 * - Provides "current game" pointer for frontend convenience
 * - Ensures all service fees flow to the factory owner
 * 
 * BUSINESS MODEL:
 * - Players can create games for free using default parameters
 * - Factory owner earns service fee from all games (usually 5%)
 * - Owner can customize default parameters for new games
 * 
 * ARCHITECTURE:
 * - Each game is an independent TwoThirdsAverageGame contract
 * - Factory maintains ownership of all created games so service fees flow back
 * - Uses CREATE (via `new`) to deploy games; can be extended to CREATE2 for deterministic addresses
 * - Registry of deployed games is stored on-chain for enumeration and lookups
 */
contract GameFactory is Ownable {
    /**
     * @dev Constructor sets the deployer as the factory owner.
     */
    constructor() Ownable(msg.sender) {}

    // === GAME REGISTRY ===

    /// @notice Array of all deployed TwoThirdsAverageGame contract addresses
    address[] public games;

    /// @notice Mapping to quickly verify whether an address was created by this factory
    mapping(address => bool) public gameExists;

    /// @notice Currently featured or active game for frontend convenience
    address public currentGame;

    // === DEFAULT GAME PARAMETERS (packed into one storage slot) ===
    //   - defaultMinPlayers       (uint16)  : Minimum number of players to start a game (≥3)
    //   - defaultMaxPlayers       (uint16)  : Maximum players allowed in a game
    //   - defaultCommitDuration   (uint32)  : Duration of commit phase, in seconds
    //   - defaultRevealDuration   (uint32)  : Duration of reveal phase, in seconds
    //   - defaultAutoStartDelay   (uint32)  : Delay after minPlayers reached before commit begins
    //   - defaultServiceFeePercent(uint8)   : Platform fee percentage (≤20%)
    //
    // The remaining bytes in this slot are unused.
    uint16 public defaultMinPlayers       = 3;
    uint16 public defaultMaxPlayers       = 15;
    uint32 public defaultCommitDuration   = 90;
    uint32 public defaultRevealDuration   = 60;
    uint32 public defaultAutoStartDelay   = 60;
    uint8  public defaultServiceFeePercent = 5;

    /// @notice Default entry fee for each player, expressed in wei (e.g. 0.01 ether)
    uint256 public defaultEntryFee = 0.1 ether;

    // === EVENTS ===

    /// @notice Emitted when a new game is created (address and index in `games` array)
    event GameCreated(address indexed gameAddress, uint256 indexed gameId);

    /// @notice Emitted when `currentGame` is set or changed
    event CurrentGameSet(address indexed gameAddress);

    /// @notice Emitted when default parameters are updated by the owner
    event DefaultParametersUpdated();

    /**
     * @dev Deploy a TwoThirdsAverageGame with custom parameters. Only the factory owner may call.
     * @param _minPlayers Minimum players required to start (must be ≥ 3)
     * @param _maxPlayers Maximum players allowed (must be > _minPlayers)
     * @param _commitDuration Length of commit phase in seconds (must be > 0)
     * @param _revealDuration Length of reveal phase in seconds (must be > 0)
     * @param _entryFee Entry fee (wei) for each player to join
     * @param _serviceFeePercent Platform service fee percentage (must be ≤ 20)
     * @param _autoStartDelay Delay (seconds) after minPlayers reached before commit phase starts (must be > 0)
     * @return Address of the newly deployed TwoThirdsAverageGame contract
     *
     * Implements:
     * 1. Parameter validation (revert if inputs invalid)
     * 2. Child contract deployment via `new TwoThirdsAverageGame(...)`
     * 3. Registry insertion (`games.push(...)` and `gameExists[...] = true`)
     * 4. Transfer of ownership of the child game to the factory owner
     * 5. Setting `currentGame` if this is the very first game deployed
     */
    function createCustomGame(
        uint16 _minPlayers,
        uint16 _maxPlayers,
        uint32 _commitDuration,
        uint32 _revealDuration,
        uint256 _entryFee,
        uint8 _serviceFeePercent,
        uint32 _autoStartDelay
    ) 
        public 
        onlyOwner 
        returns (address) 
    {
        // Validate parameters (cheap checks first to save gas in failure case)
        require(_minPlayers >= 3, "Min >= 3");
        require(_maxPlayers > _minPlayers, "Max > Min");
        require(_serviceFeePercent <= 20, "Fee <= 20%");
        require(_commitDuration > 0, "Commit dur > 0");
        require(_revealDuration > 0, "Reveal dur > 0");
        require(_autoStartDelay > 0, "Delay > 0");

        // 1. Deploy the new TwoThirdsAverageGame contract
        TwoThirdsAverageGame game = new TwoThirdsAverageGame(
            _minPlayers,
            _maxPlayers,
            _commitDuration,
            _revealDuration,
            _entryFee,
            _serviceFeePercent,
            _autoStartDelay
        );
        address addr = address(game);

        // 2. Register the game in the local registry
        uint256 idx = games.length;    // Cache current length (SLOAD)
        games.push(addr);              // Push new game address onto array (SSTORE ×2)
        gameExists[addr] = true;       // Mark existence in mapping (SSTORE)

        // 3. Transfer ownership of the new game to the factory owner
        //    Ensures that any service fees collected by the child game go to the factory owner
        game.transferOwnership(owner());

        // 4. If this is the first-ever game, set it as currentGame for the frontend
        if (currentGame == address(0)) {
            currentGame = addr;        
            emit CurrentGameSet(addr);
        }

        // 5. Emit GameCreated event, providing the game address and its index
        emit GameCreated(addr, idx);

        return addr;
    }

    /**
     * @dev Deploy a TwoThirdsAverageGame with factory default parameters. Anyone may call.
     * @return Address of the newly deployed TwoThirdsAverageGame contract
     *
     * This uses the factory’s default configuration:
     *   - defaultMinPlayers
     *   - defaultMaxPlayers
     *   - defaultCommitDuration
     *   - defaultRevealDuration
     *   - defaultEntryFee
     *   - defaultServiceFeePercent
     *   - defaultAutoStartDelay
     *
     * Process:
     * 1. Deploy child game with default parameters
     * 2. Register it in the registry (`games` array + `gameExists` mapping)
     * 3. Transfer ownership of the child to factory owner (so fees flow correctly)
     * 4. If first game, set `currentGame`
     * 5. Emit `GameCreated`
     */
    function createGame() external returns (address) {
        // 1. Deploy child with default parameters
        TwoThirdsAverageGame game = new TwoThirdsAverageGame(
            defaultMinPlayers,
            defaultMaxPlayers,
            defaultCommitDuration,
            defaultRevealDuration,
            defaultEntryFee,
            defaultServiceFeePercent,
            defaultAutoStartDelay
        );
        address addr = address(game);

        // 2. Register in registry
        uint256 idx = games.length;    // Cache array length (SLOAD)
        games.push(addr);              // Append address (SSTORE ×2)
        gameExists[addr] = true;       // Mark existence (SSTORE)

        // 3. Transfer ownership of new game to factory owner
        game.transferOwnership(owner());

        // 4. If this is the first-ever game, mark it as current
        if (currentGame == address(0)) {
            currentGame = addr;
            emit CurrentGameSet(addr);
        }

        // 5. Emit GameCreated event
        emit GameCreated(addr, idx);

        return addr;
    }

    /**
     * @dev Update the factory’s default parameters for new games. Only the factory owner may call.
     * @param _minPlayers Minimum players required to start a game (≥ 3)
     * @param _maxPlayers Maximum allowed players (must be > _minPlayers)
     * @param _commitDuration Commit phase length in seconds (> 0)
     * @param _revealDuration Reveal phase length in seconds (> 0)
     * @param _entryFee Entry fee (in wei) for each player
     * @param _serviceFeePercent Platform fee percentage (0–20)
     * @param _autoStartDelay Delay in seconds after minPlayers reached before commit begins (> 0)
     *
     * Emits a {DefaultParametersUpdated} event.
     */
    function setDefaultParameters(
        uint16 _minPlayers,
        uint16 _maxPlayers,
        uint32 _commitDuration,
        uint32 _revealDuration,
        uint256 _entryFee,
        uint8 _serviceFeePercent,
        uint32 _autoStartDelay
    )
        external
        onlyOwner
    {
        // Validate inputs
        require(_minPlayers >= 3, "Min >= 3");
        require(_maxPlayers > _minPlayers, "Max > Min");
        require(_serviceFeePercent <= 20, "Fee <= 20%");
        require(_commitDuration > 0, "Commit dur > 0");
        require(_revealDuration > 0, "Reveal dur > 0");
        require(_autoStartDelay > 0, "Delay > 0");

        // Update packed defaults in-place
        defaultMinPlayers        = _minPlayers;
        defaultMaxPlayers        = _maxPlayers;
        defaultCommitDuration    = _commitDuration;
        defaultRevealDuration    = _revealDuration;
        defaultEntryFee          = _entryFee;
        defaultServiceFeePercent = _serviceFeePercent;
        defaultAutoStartDelay    = _autoStartDelay;

        emit DefaultParametersUpdated();
    }

    /**
     * @dev Retrieve all default game parameters in one call.
     * @return (
     *   defaultMinPlayers,
     *   defaultMaxPlayers,
     *   defaultCommitDuration,
     *   defaultRevealDuration,
     *   defaultEntryFee,
     *   defaultServiceFeePercent,
     *   defaultAutoStartDelay
     * )
     */
    function getDefaults()
        external
        view
        returns (
            uint16, uint16, uint32, uint32, uint256, uint8, uint32
        )
    {
        return (
            defaultMinPlayers,
            defaultMaxPlayers,
            defaultCommitDuration,
            defaultRevealDuration,
            defaultEntryFee,
            defaultServiceFeePercent,
            defaultAutoStartDelay
        );
    }

    /**
     * @dev Set the “featured” or “active” game address. Only the factory owner may call.
     * @param _game Address of a game that must already exist (created by this factory)
     *
     * Emits a {CurrentGameSet} event.
     */
    function setCurrentGame(address _game) external onlyOwner {
        require(gameExists[_game], "Game not found");
        currentGame = _game;
        emit CurrentGameSet(_game);
    }

    // === VIEW HELPERS ===

    /**
     * @dev Returns the total number of games deployed by this factory.
     * @return Number of games in the `games` array.
     */
    function getGamesCount() external view returns (uint256) {
        return games.length;
    }

    /**
     * @dev Returns the full array of deployed game addresses.
     * Can be used by a frontend to enumerate all games in a single call.
     * @return Array of addresses corresponding to each TwoThirdsAverageGame deployed.
     */
    function getAllGames() external view returns (address[] memory) {
        return games;
    }

    /**
     * @dev Returns the TwoThirdsAverageGame instance corresponding to `currentGame`.
     * @return TwoThirdsAverageGame contract at the `currentGame` address.
     *
     * Reverts if `currentGame` has not been set (i.e. is address(0)).
     */
    function getCurrentGameContract() external view returns (TwoThirdsAverageGame) {
        require(currentGame != address(0), "No current game");
        return TwoThirdsAverageGame(currentGame);
    }

    // === HELPER FOR DEPLOYMENT SCRIPTS ===

    /**
     * @dev Returns a formatted string of the current default parameters.
     * Useful for deployment or configuration scripts to display values in a human-readable form.
     * Only the factory owner can call.
     * @return A concatenated string listing each default parameter on its own line.
     */
    function updateDeployScript() external view onlyOwner returns (string memory) {
        return string(
            abi.encodePacked(
                "minPlayers: ",        uint2str(defaultMinPlayers),         "\n",
                "maxPlayers: ",        uint2str(defaultMaxPlayers),         "\n",
                "commitDuration: ",    uint2str(defaultCommitDuration),      "\n",
                "revealDuration: ",    uint2str(defaultRevealDuration),      "\n",
                "entryFee: ",          uint2str(defaultEntryFee),            "\n",
                "serviceFeePercent: ", uint2str(defaultServiceFeePercent),    "\n",
                "autoStartDelay: ",    uint2str(defaultAutoStartDelay)
            )
        );
    }

    /**
     * @dev Internal helper to convert a uint256 to its ASCII string decimal representation.
     * Adapted from OpenZeppelin’s Strings.toString.
     * @param v The integer to convert.
     * @return The ASCII string representation of `v`.
     */
    function uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) {
            return "0";
        }
        uint256 x = v;
        uint256 len;
        while (x != 0) {
            len++;
            x /= 10;
        }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len--;
            b[len] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(b);
    }
}
