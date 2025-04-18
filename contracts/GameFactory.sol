// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TwoThirdsAverageGame.sol";

/**
 * @title GameFactory
 * @dev Factory contract for creating and managing TwoThirdsAverageGame instances
 */
contract GameFactory is Ownable {
    // Array to store all game addresses
    address[] public games;
    
    // Mapping from game address to boolean indicating if it exists
    mapping(address => bool) public gameExists;
    
    // Current active game
    address public currentGame;
    
    // Default game parameters
    uint256 public defaultMinPlayers = 3;
    uint256 public defaultMaxPlayers = 15;
    uint256 public defaultSubmissionDuration = 120; // 2 minutes
    uint256 public defaultEntryFee = 0.01 ether;
    uint256 public defaultServiceFeePercent = 5; // 5% service fee
    uint256 public defaultAutoStartDelay = 60; // 1 minute auto-start delay
    
    // Events
    event GameCreated(address gameAddress, uint256 gameId);
    event CurrentGameSet(address gameAddress);
    event DefaultParametersUpdated();
    
    /**
     * @dev Constructor sets the owner of the contract
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Creates a new game instance with custom parameters
     * @param _minPlayers Minimum number of players required
     * @param _maxPlayers Maximum number of players allowed
     * @param _submissionDuration Duration of submission phase in seconds
     * @param _entryFee Entry fee in wei
     * @param _serviceFeePercent Service fee percentage (out of 100)
     * @param _autoStartDelay Time in seconds after min players reached to auto-start
     * @return Address of the newly created game
     */
    function createCustomGame(
        uint256 _minPlayers,
        uint256 _maxPlayers,
        uint256 _submissionDuration,
        uint256 _entryFee,
        uint256 _serviceFeePercent,
        uint256 _autoStartDelay
    ) external onlyOwner returns (address) {
        TwoThirdsAverageGame newGame = new TwoThirdsAverageGame(
            _minPlayers,
            _maxPlayers,
            _submissionDuration,
            _entryFee,
            _serviceFeePercent,
            _autoStartDelay
        );
        
        address gameAddress = address(newGame);
        games.push(gameAddress);
        gameExists[gameAddress] = true;
        
        // Transfer ownership to the factory owner
        newGame.transferOwnership(owner());
        
        // Set as current game if no current game exists
        if (currentGame == address(0)) {
            currentGame = gameAddress;
            emit CurrentGameSet(gameAddress);
        }
        
        emit GameCreated(gameAddress, games.length - 1);
        return gameAddress;
    }
    
    /**
     * @dev Creates a new game instance with default parameters
     * @return Address of the newly created game
     */
    function createGame() external onlyOwner returns (address) {
        return createCustomGame(
            defaultMinPlayers,
            defaultMaxPlayers,
            defaultSubmissionDuration,
            defaultEntryFee,
            defaultServiceFeePercent,
            defaultAutoStartDelay
        );
    }
    
    /**
     * @dev Sets the default game parameters
     */
    function setDefaultParameters(
        uint256 _minPlayers,
        uint256 _maxPlayers,
        uint256 _submissionDuration,
        uint256 _entryFee,
        uint256 _serviceFeePercent,
        uint256 _autoStartDelay
    ) external onlyOwner {
        require(_minPlayers >= 3, "Minimum players must be at least 3");
        require(_maxPlayers > _minPlayers, "Max players must be greater than min players");
        require(_submissionDuration > 0, "Submission duration must be greater than 0");
        require(_serviceFeePercent <= 20, "Service fee cannot exceed 20%");
        require(_autoStartDelay > 0, "Auto start delay must be greater than 0");
        
        defaultMinPlayers = _minPlayers;
        defaultMaxPlayers = _maxPlayers;
        defaultSubmissionDuration = _submissionDuration;
        defaultEntryFee = _entryFee;
        defaultServiceFeePercent = _serviceFeePercent;
        defaultAutoStartDelay = _autoStartDelay;
        
        emit DefaultParametersUpdated();
    }
    
    /**
     * @dev Sets the current active game
     * @param _gameAddress Address of the game to set as current
     */
    function setCurrentGame(address _gameAddress) external onlyOwner {
        require(gameExists[_gameAddress], "Game does not exist");
        currentGame = _gameAddress;
        emit CurrentGameSet(_gameAddress);
    }
    
    /**
     * @dev Returns the total number of games created
     * @return Number of games
     */
    function getGamesCount() external view returns (uint256) {
        return games.length;
    }
    
    /**
     * @dev Returns all game addresses
     * @return Array of game addresses
     */
    function getAllGames() external view returns (address[] memory) {
        return games;
    }
    
    /**
     * @dev Returns the current game instance
     * @return Current game contract
     */
    function getCurrentGameContract() external view returns (TwoThirdsAverageGame) {
        require(currentGame != address(0), "No current game set");
        return TwoThirdsAverageGame(currentGame);
    }
    
    /**
     * @dev Updates the deploy script to match the current contract parameters
     */
    function updateDeployScript() external view onlyOwner returns (string memory) {
        // This is a helper function that returns the parameters that should be used in the deploy script
        // It doesn't actually modify any files, just returns the values that should be used
        return string(abi.encodePacked(
            "minPlayers: ", uint256ToString(defaultMinPlayers), "\n",
            "maxPlayers: ", uint256ToString(defaultMaxPlayers), "\n",
            "submissionDuration: ", uint256ToString(defaultSubmissionDuration), "\n",
            "entryFee: ", uint256ToString(defaultEntryFee), "\n",
            "serviceFeePercent: ", uint256ToString(defaultServiceFeePercent), "\n",
            "autoStartDelay: ", uint256ToString(defaultAutoStartDelay)
        ));
    }
    
    /**
     * @dev Helper function to convert uint256 to string
     */
    function uint256ToString(uint256 value) internal pure returns (string memory) {
        // This function is simplified and only works for reasonable numbers
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
