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
 * - Ensures all service fees flow to factory owner
 * 
 * BUSINESS MODEL:
 * - Players can create games for free using default parameters
 * - Factory owner earns service fee from all games (usually 5%)
 * - Owner can customize default parameters for new games
 * 
 * ARCHITECTURE:
 * - Factory uses CREATE2 opcode for deterministic addresses
 * - Each game is independent TwoThirdsAverageGame contract
 * - Factory maintains ownership of all created games
 */
contract GameFactory is Ownable {
    constructor() Ownable(msg.sender) {}
    
    // === GAME REGISTRY ===
    address[] public games;                    // All deployed game addresses
    mapping(address => bool) public gameExists; // Quick existence check
    address public currentGame;                // Featured/active game for UI

    // === DEFAULT GAME PARAMETERS ===
    // These are used when anyone calls createGame() - owner can modify them
    uint256 public defaultMinPlayers         = 3;          // Minimum to start
    uint256 public defaultMaxPlayers         = 60;         // Maximum capacity  
    uint256 public defaultCommitDuration     = 120;        // Commit phase (seconds)
    uint256 public defaultRevealDuration     = 120;        // Reveal phase (seconds)
    uint256 public defaultEntryFee           = 0.01 ether; // Player entry cost
    uint256 public defaultServiceFeePercent  = 5;          // Platform fee (%)
    uint256 public defaultAutoStartDelay     = 60;         // Grace period (seconds)

    event GameCreated(address indexed gameAddress, uint256 indexed gameId);
    event CurrentGameSet(address indexed gameAddress);
    event DefaultParametersUpdated();

    /**
     * @dev Deploy a game with custom parameters (owner only)
     */
    function createCustomGame(
        uint256 _minPlayers,
        uint256 _maxPlayers,
        uint256 _commitDuration,
        uint256 _revealDuration,
        uint256 _entryFee,
        uint256 _serviceFeePercent,
        uint256 _autoStartDelay
    ) public onlyOwner returns (address) {
        // Validate parameters
        require(_minPlayers >= 3, "Min >= 3");
        require(_maxPlayers > _minPlayers, "Max > Min");
        require(_commitDuration > 0, "Commit dur > 0");
        require(_revealDuration > 0, "Reveal dur > 0");
        require(_serviceFeePercent <= 20, "Fee <= 20%");
        require(_autoStartDelay > 0, "Delay > 0");

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
        games.push(addr);
        gameExists[addr] = true;
        // ensure factory deployer remains owner
        game.transferOwnership(owner());

        if (currentGame == address(0)) {
            currentGame = addr;
            emit CurrentGameSet(addr);
        }
        emit GameCreated(addr, games.length - 1);
        return addr;
    }

    /**
     * @dev Deploy a game with factory defaults (anyone can call)
     */
    /**
 * @dev Deploy a game with factory defaults (anyone can call)
 */
function createGame() external returns (address) {
    // 1. Deploy a new TwoThirdsAverageGame with the default parameters
    TwoThirdsAverageGame game = new TwoThirdsAverageGame(
        defaultMinPlayers,
        defaultMaxPlayers,
        defaultCommitDuration,
        defaultRevealDuration,
        defaultEntryFee,
        defaultServiceFeePercent,
        defaultAutoStartDelay
    );

    // 2. Register it in the factory’s state
    address addr = address(game);
    games.push(addr);
    gameExists[addr] = true;

    // 3. Transfer ownership of the game contract to the factory owner
    //    so that service fees always flow back to you
    game.transferOwnership(owner());

    // 4. If this is the first-ever game, set currentGame
    if (currentGame == address(0)) {
       currentGame = addr;
       emit CurrentGameSet(addr);
    }


    // 5. Emit the GameCreated event
    emit GameCreated(addr, games.length - 1);

    // 6. Return the new game address to the caller
    return addr;
}


    /**
     * @dev Update default parameters (owner only)
     */
    function setDefaultParameters(
        uint256 _minPlayers,
        uint256 _maxPlayers,
        uint256 _commitDuration,
        uint256 _revealDuration,
        uint256 _entryFee,
        uint256 _serviceFeePercent,
        uint256 _autoStartDelay
    ) external onlyOwner {
        require(_minPlayers >= 3, "Min >= 3");
        require(_maxPlayers > _minPlayers, "Max > Min");
        require(_commitDuration > 0, "Commit dur > 0");
        require(_revealDuration > 0, "Reveal dur > 0");
        require(_serviceFeePercent <= 20, "Fee <= 20%");
        require(_autoStartDelay > 0, "Delay > 0");

        defaultMinPlayers         = _minPlayers;
        defaultMaxPlayers         = _maxPlayers;
        defaultCommitDuration     = _commitDuration;
        defaultRevealDuration     = _revealDuration;
        defaultEntryFee           = _entryFee;
        defaultServiceFeePercent  = _serviceFeePercent;
        defaultAutoStartDelay     = _autoStartDelay;

        emit DefaultParametersUpdated();
    }

    /** @dev Get all default parameters in one call */
    function getDefaults()
        external
        view
        returns (
            uint256, uint256, uint256, uint256, uint256, uint256, uint256
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

    /** @dev Set current active game pointer (owner only) */
    function setCurrentGame(address _game) external onlyOwner {
        require(gameExists[_game], "Game not found");
        currentGame = _game;
        emit CurrentGameSet(_game);
    }

    /** View helpers */
    function getGamesCount() external view returns (uint256) {
        return games.length;
    }
    function getAllGames() external view returns (address[] memory) {
        return games;
    }
    function getCurrentGameContract() external view returns (TwoThirdsAverageGame) {
        require(currentGame != address(0), "No current game");
        return TwoThirdsAverageGame(currentGame);
    }

    /** Helper for deployment scripts (owner only) */
    function updateDeployScript() external view onlyOwner returns (string memory) {
        return string(
            abi.encodePacked(
                "minPlayers: ",      uint2str(defaultMinPlayers), "\n",
                "maxPlayers: ",      uint2str(defaultMaxPlayers), "\n",
                "commitDuration: ",  uint2str(defaultCommitDuration), "\n",
                "revealDuration: ",  uint2str(defaultRevealDuration), "\n",
                "entryFee: ",        uint2str(defaultEntryFee), "\n",
                "serviceFeePercent: ",uint2str(defaultServiceFeePercent), "\n",
                "autoStartDelay: ",  uint2str(defaultAutoStartDelay)
            )
        );
    }

    function uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 x = v;
        uint256 len;
        while (x != 0) { len++; x /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len--;
            b[len] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }
}
