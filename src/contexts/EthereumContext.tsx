import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ethers } from "ethers";

// Import contract ABIs
// Note: In a real implementation, these would be imported from the artifacts directory
// For now, we'll define minimal ABIs that match our contract functions
const GameFactoryABI = [
  "function createGame() external returns (address)",
  "function currentGame() external view returns (address)",
  "function setDefaultParameters(uint256 _minPlayers, uint256 _maxPlayers, uint256 _submissionDuration, uint256 _entryFee, uint256 _serviceFeePercent, uint256 _autoStartDelay) external",
  "function owner() external view returns (address)",
  "function withdrawServiceFees() external",
];

const TwoThirdsAverageGameABI = [
  // Game state functions
  "function gamePhase() external view returns (uint8)",
  "function playerCount() external view returns (uint256)",
  "function timeRemaining() external view returns (uint256)",
  "function minPlayers() external view returns (uint256)",
  "function maxPlayers() external view returns (uint256)",
  "function submissionDuration() external view returns (uint256)",
  "function autoStartDelay() external view returns (uint256)",
  "function entryFee() external view returns (uint256)",
  "function serviceFeePercent() external view returns (uint256)",
  "function prizePool() external view returns (uint256)",
  "function winningNumber() external view returns (uint256)",
  "function winner() external view returns (address)",
  "function getAllSubmissions() external view returns (uint256[] memory)",

  // Player actions
  "function joinGame() external payable",
  "function commitNumber(bytes32 _hash) external",
  "function revealNumber(uint256 _number, string memory _salt) external",
  "function getPlayerSubmission(address _player) external view returns (uint256)",
  "function hasPlayerJoined(address _player) external view returns (bool)",
  "function hasPlayerSubmitted(address _player) external view returns (bool)",
  "function withdraw() external",

  // Events
  "event GamePhaseChanged(uint8 newPhase)",
  "event PlayerJoined(address player)",
  "event NumberCommitted(address player)",
  "event NumberRevealed(address player, uint256 number)",
  "event GameEnded(address winner, uint256 winningNumber, uint256 prizeAmount)",
  "event PrizeWithdrawn(address winner, uint256 amount)",
];

// Game phase enum to match the contract
enum GamePhase {
  WAITING_FOR_PLAYERS = 0,
  GAME_STARTING = 1,
  SUBMISSIONS_OPEN = 2,
  REVEAL_PHASE = 3,
  EVALUATING_RESULTS = 4,
  GAME_ENDED = 5,
}

interface EthereumContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  gameFactoryContract: ethers.Contract | null;
  currentGameContract: ethers.Contract | null;
  gamePhase: number | null;
  playerCount: number;
  timeRemaining: number;
  submissions: number[];
  winningNumber: number | null;
  winner: string | null;
  prizeAmount: string | null;
  entryFee: string | null;
  hasJoined: boolean;
  hasSubmitted: boolean;
  hasRevealed: boolean;
  isFactoryOwner: boolean;
  playerNumber: number | null;
  players: { address: string; number: number }[];
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  submitNumber: (hash: string) => Promise<void>;
  revealNumber: (number: number, salt: string) => Promise<void>;
  joinGame: () => Promise<void>;
  refreshGameState: () => Promise<void>;
  withdrawPrize: () => Promise<void>;
  withdrawServiceFees: () => Promise<void>;
  error: string | null;
}

const EthereumContext = createContext<EthereumContextType | undefined>(
  undefined,
);

// Contract addresses - these will be set after deployment
const GAME_FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default local hardhat address

export const EthereumProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game contracts
  const [gameFactoryContract, setGameFactoryContract] =
    useState<ethers.Contract | null>(null);
  const [currentGameContract, setCurrentGameContract] =
    useState<ethers.Contract | null>(null);
  const [currentGameAddress, setCurrentGameAddress] = useState<string | null>(
    null,
  );

  // Game state
  const [gamePhase, setGamePhase] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [submissions, setSubmissions] = useState<number[]>([]);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [prizeAmount, setPrizeAmount] = useState<string | null>(null);
  const [entryFee, setEntryFee] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [hasRevealed, setHasRevealed] = useState<boolean>(false);
  const [isFactoryOwner, setIsFactoryOwner] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [players, setPlayers] = useState<{ address: string; number: number }[]>(
    [],
  );

  // Initialize provider from window.ethereum
  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(browserProvider);

          // Check if already connected
          const accounts = await browserProvider.listAccounts();
          if (accounts.length > 0) {
            const userSigner = await browserProvider.getSigner();
            setSigner(userSigner);
            setAccount(await userSigner.getAddress());
            setChainId((await browserProvider.getNetwork()).chainId);
            setIsConnected(true);
          }
        } catch (err) {
          console.error("Failed to initialize provider:", err);
          setError("Failed to initialize provider");
        }
      } else {
        setError("Ethereum wallet not detected. Please install MetaMask.");
      }
    };

    initProvider();
  }, []);

  // Initialize contracts when signer is available
  useEffect(() => {
    const initContracts = async () => {
      if (!provider || !signer) return;

      try {
        // Connect to the GameFactory contract
        const factory = new ethers.Contract(
          GAME_FACTORY_ADDRESS,
          GameFactoryABI,
          signer,
        );
        setGameFactoryContract(factory);

        // Get the current game address
        const gameAddress = await factory.currentGame();
        setCurrentGameAddress(gameAddress);

        // Connect to the current game contract
        if (gameAddress && gameAddress !== ethers.ZeroAddress) {
          const game = new ethers.Contract(
            gameAddress,
            TwoThirdsAverageGameABI,
            signer,
          );
          setCurrentGameContract(game);

          // Initial state fetch
          await fetchGameState(game);
        } else {
          console.log("No active game found. Creating a new game...");
          try {
            // Create a new game if none exists
            const tx = await factory.createGame();
            await tx.wait();

            // Get the new game address
            const newGameAddress = await factory.currentGame();
            setCurrentGameAddress(newGameAddress);

            // Connect to the new game
            const newGame = new ethers.Contract(
              newGameAddress,
              TwoThirdsAverageGameABI,
              signer,
            );
            setCurrentGameContract(newGame);

            // Fetch initial state
            await fetchGameState(newGame);
          } catch (err) {
            console.error("Failed to create new game:", err);
            setError("Failed to create new game. Please try again.");
          }
        }
      } catch (err) {
        console.error("Failed to initialize contracts:", err);
        setError(
          "Failed to connect to game contracts. Please check your network connection.",
        );
      }
    };

    if (isConnected) {
      initContracts();
    }
  }, [provider, signer, isConnected]);

  // Fetch game state from the contract
  const fetchGameState = async (gameContract: ethers.Contract) => {
    try {
      // Get game phase
      const phase = await gameContract.gamePhase();
      setGamePhase(Number(phase));

      // Get player count
      const count = await gameContract.playerCount();
      setPlayerCount(Number(count));

      // Get time remaining based on game phase
      if (phase === GamePhase.GAME_STARTING) {
        const delay = await gameContract.autoStartDelay();
        setTimeRemaining(Number(delay));
      } else if (phase === GamePhase.SUBMISSIONS_OPEN) {
        const duration = await gameContract.submissionDuration();
        setTimeRemaining(Number(duration));
      } else {
        setTimeRemaining(0);
      }

      // Get entry fee
      const fee = await gameContract.entryFee();
      setEntryFee(ethers.formatEther(fee));

      // Check if current user has joined
      if (account) {
        const joined = await gameContract.hasPlayerJoined(account);
        setHasJoined(joined);

        // Check if current user has submitted a number
        const submitted = await gameContract.hasPlayerSubmitted(account);
        setHasSubmitted(submitted);

        // Check if current user has revealed their number
        const revealed = await gameContract.hasPlayerRevealed(account);
        setHasRevealed(revealed);

        // Get player number
        try {
          const playerNum = await gameContract.getPlayerNumber(account);
          setPlayerNumber(Number(playerNum));
        } catch (err) {
          console.error("Failed to get player number:", err);
          setPlayerNumber(null);
        }
      }

      // Get all players with their numbers
      try {
        const playerCount = await gameContract.playerCount();
        const playersList = [];

        for (let i = 1; i <= playerCount; i++) {
          const playerAddress = await gameContract.getPlayerByNumber(i);
          if (playerAddress !== ethers.ZeroAddress) {
            playersList.push({
              address: playerAddress,
              number: i,
            });
          }
        }

        setPlayers(playersList);
      } catch (err) {
        console.error("Failed to get players list:", err);
      }

      // If game has ended, get results
      if (phase === GamePhase.GAME_ENDED) {
        const winNumber = await gameContract.winningNumber();
        setWinningNumber(Number(winNumber));

        const winnerAddress = await gameContract.winner();
        setWinner(winnerAddress);

        const prize = await gameContract.prizePool();
        setPrizeAmount(ethers.formatEther(prize));

        // Get all submissions for visualization
        try {
          const allSubmissions = await gameContract.getAllSubmissions();
          setSubmissions(
            allSubmissions.map((num: ethers.BigNumberish) => Number(num)),
          );
        } catch (err) {
          console.error("Failed to fetch all submissions:", err);
        }
      }

      // Check if user is factory owner
      if (account && gameFactoryContract) {
        try {
          const ownerAddress = await gameFactoryContract.owner();
          setIsFactoryOwner(
            ownerAddress.toLowerCase() === account.toLowerCase(),
          );
        } catch (err) {
          console.error("Failed to check factory owner:", err);
          setIsFactoryOwner(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch game state:", err);
    }
  };

  // Define refreshGameState function before using it in useEffect
  const refreshGameState = async () => {
    if (!currentGameContract) return;

    try {
      await fetchGameState(currentGameContract);
    } catch (err) {
      console.error("Error refreshing game state:", err);
    }
  };

  // Refresh game state when contract is available
  useEffect(() => {
    if (currentGameContract) {
      // Initial refresh
      refreshGameState();

      // Set up interval to refresh game state
      const interval = setInterval(() => refreshGameState(), 5000); // Every 5 seconds

      // Set up event listeners
      const setupEventListeners = async () => {
        currentGameContract.on("GamePhaseChanged", (newPhase) => {
          console.log("Game phase changed to:", newPhase);
          setGamePhase(Number(newPhase));
          refreshGameState(); // Refresh full state when phase changes
        });

        currentGameContract.on("PlayerJoined", (player) => {
          console.log("Player joined:", player);
          setPlayerCount((prev) => prev + 1);
          if (player.toLowerCase() === account?.toLowerCase()) {
            setHasJoined(true);
          }
          refreshGameState(); // Ensure player count is updated
        });

        currentGameContract.on("NumberCommitted", (player) => {
          console.log("Number committed by:", player);
          if (player.toLowerCase() === account?.toLowerCase()) {
            setHasSubmitted(true);
          }
          refreshGameState(); // Refresh to get updated submissions
        });

        currentGameContract.on("NumberRevealed", (player, number) => {
          console.log("Number revealed by:", player, "Number:", number);
          if (player.toLowerCase() === account?.toLowerCase()) {
            setHasRevealed(true);
          }
          refreshGameState(); // Refresh to get updated submissions
        });

        currentGameContract.on(
          "GameEnded",
          (winnerAddress, winningNum, prizeAmount) => {
            console.log(
              "Game ended. Winner:",
              winnerAddress,
              "Number:",
              winningNum,
              "Prize:",
              prizeAmount,
            );
            setWinner(winnerAddress);
            setWinningNumber(Number(winningNum));
            setPrizeAmount(ethers.formatEther(prizeAmount));
            // Fetch all submissions for visualization
            refreshGameState();
          },
        );

        currentGameContract.on("PrizeWithdrawn", (winner, amount) => {
          console.log("Prize withdrawn by:", winner, "Amount:", amount);
          refreshGameState(); // Update state after prize withdrawal
        });
      };

      setupEventListeners();

      return () => {
        clearInterval(interval);
        // Remove event listeners
        if (currentGameContract.removeAllListeners) {
          currentGameContract.removeAllListeners();
        }
      };
    }
  }, [currentGameContract, account]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          disconnectWallet();
        } else if (accounts[0] !== account) {
          // Account changed
          if (provider) {
            const userSigner = await provider.getSigner();
            setSigner(userSigner);
            setAccount(accounts[0]);
            setIsConnected(true);

            // Refresh player-specific state
            if (currentGameContract) {
              const joined = await currentGameContract.hasPlayerJoined(
                accounts[0],
              );
              setHasJoined(joined);

              const submitted = await currentGameContract.hasPlayerSubmitted(
                accounts[0],
              );
              setHasSubmitted(submitted);
            }
          }
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [account, provider, currentGameContract]);

  // Connect wallet function
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Ethereum wallet not detected. Please install MetaMask.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      const userSigner = await browserProvider.getSigner();
      const userAddress = await userSigner.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(userSigner);
      setAccount(userAddress);
      setChainId(network.chainId);
      setIsConnected(true);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setGameFactoryContract(null);
    setCurrentGameContract(null);
    setCurrentGameAddress(null);
    setHasJoined(false);
    setHasSubmitted(false);
  };

  // refreshGameState function is now defined above the useEffect that uses it

  // Join game function
  const joinGame = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    // If no current game contract, create a new game
    if (!currentGameContract) {
      try {
        setError(null);

        if (!gameFactoryContract) {
          setError("Game factory contract not initialized");
          return;
        }

        // Create a new game
        console.log("Creating a new game...");
        const tx = await gameFactoryContract.createGame();
        await tx.wait();

        // Get the new game address
        const newGameAddress = await gameFactoryContract.currentGame();
        setCurrentGameAddress(newGameAddress);

        // Connect to the new game
        const newGame = new ethers.Contract(
          newGameAddress,
          TwoThirdsAverageGameABI,
          signer,
        );
        setCurrentGameContract(newGame);

        // Refresh game state
        await fetchGameState(newGame);

        console.log("Successfully created new game");
        return;
      } catch (err: any) {
        console.error("Failed to create new game:", err);
        setError(
          "Failed to create new game: " + (err.message || "Unknown error"),
        );
        return;
      }
    }

    // Check if already joined
    if (hasJoined) {
      setError("You have already joined this game");
      return;
    }

    // Check if game is in the correct phase
    if (
      gamePhase !== GamePhase.WAITING_FOR_PLAYERS &&
      gamePhase !== GamePhase.GAME_STARTING
    ) {
      setError("Cannot join game at this phase");
      return;
    }

    try {
      setError(null);

      // Get entry fee
      const fee = await currentGameContract.entryFee();

      // Join the game with the required entry fee
      const tx = await currentGameContract.joinGame({ value: fee });
      await tx.wait();

      console.log("Successfully joined game");
      setHasJoined(true);

      // Refresh game state
      await refreshGameState();
    } catch (err: any) {
      console.error("Failed to join game:", err);
      setError("Failed to join game: " + (err.message || "Unknown error"));
    }
  };

  // Submit number function (now commits a hash)
  const submitNumber = async (hash: string) => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!currentGameContract) {
      setError("Game contract not initialized");
      return;
    }

    // Check if player has joined
    if (!hasJoined) {
      setError("You must join the game before committing a number");
      return;
    }

    // Check if already submitted
    if (hasSubmitted) {
      setError("You have already committed a number");
      return;
    }

    // Check if in submission phase
    if (gamePhase !== GamePhase.SUBMISSIONS_OPEN) {
      setError("You can only commit numbers during the submission phase");
      return;
    }

    try {
      setError(null);

      // Submit the hash to the contract
      const tx = await currentGameContract.commitNumber(hash);
      await tx.wait();

      console.log("Successfully committed number hash:", hash);
      setHasSubmitted(true);

      // Refresh game state
      await refreshGameState();
    } catch (err: any) {
      console.error("Failed to commit number:", err);
      setError("Failed to commit number: " + (err.message || "Unknown error"));
    }
  };

  // Reveal number function
  const revealNumber = async (number: number, salt: string) => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!currentGameContract) {
      setError("Game contract not initialized");
      return;
    }

    // Check if player has joined
    if (!hasJoined) {
      setError("You must join the game before revealing a number");
      return;
    }

    // Check if already submitted
    if (!hasSubmitted) {
      setError("You must commit a number before revealing");
      return;
    }

    // Check if already revealed
    if (hasRevealed) {
      setError("You have already revealed your number");
      return;
    }

    // Check if in reveal phase
    if (gamePhase !== GamePhase.REVEAL_PHASE) {
      setError("You can only reveal numbers during the reveal phase");
      return;
    }

    // Validate number range
    if (number < 0 || number > 1000) {
      setError("Number must be between 0 and 1000");
      return;
    }

    try {
      setError(null);

      // Reveal the number and salt to the contract
      const tx = await currentGameContract.revealNumber(number, salt);
      await tx.wait();

      console.log("Successfully revealed number:", number, "with salt:", salt);
      setHasRevealed(true);

      // Add to local submissions array for UI
      setSubmissions((prev) => [...prev, number]);

      // Refresh game state
      await refreshGameState();
    } catch (err: any) {
      console.error("Failed to reveal number:", err);
      setError("Failed to reveal number: " + (err.message || "Unknown error"));
    }
  };

  // Withdraw prize function
  const withdrawPrize = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!currentGameContract) {
      setError("Game contract not initialized");
      return;
    }

    // Check if user is the winner
    if (winner && winner.toLowerCase() !== account?.toLowerCase()) {
      setError("Only the winner can withdraw the prize");
      return;
    }

    try {
      setError(null);
      const tx = await currentGameContract.withdraw();
      await tx.wait();
      console.log("Successfully withdrew prize");

      // Refresh game state
      await refreshGameState();
    } catch (err: any) {
      console.error("Failed to withdraw prize:", err);
      setError("Failed to withdraw prize: " + (err.message || "Unknown error"));
    }
  };

  // Withdraw service fees function (for factory owner only)
  const withdrawServiceFees = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!gameFactoryContract) {
      setError("Game factory contract not initialized");
      return;
    }

    // Check if user is the factory owner
    if (!isFactoryOwner) {
      setError("Only the factory owner can withdraw service fees");
      return;
    }

    try {
      setError(null);
      const tx = await gameFactoryContract.withdrawServiceFees();
      await tx.wait();
      console.log("Successfully withdrew service fees");
    } catch (err: any) {
      console.error("Failed to withdraw service fees:", err);
      setError(
        "Failed to withdraw service fees: " + (err.message || "Unknown error"),
      );
    }
  };

  const value = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isConnecting,
    gameFactoryContract,
    currentGameContract,
    gamePhase,
    playerCount,
    timeRemaining,
    submissions,
    winningNumber,
    winner,
    prizeAmount,
    entryFee,
    hasJoined,
    hasSubmitted,
    hasRevealed,
    isFactoryOwner,
    playerNumber,
    players,
    connectWallet,
    disconnectWallet,
    submitNumber,
    revealNumber,
    joinGame,
    refreshGameState,
    withdrawPrize,
    withdrawServiceFees,
    error,
  };

  return (
    <EthereumContext.Provider value={value}>
      {children}
    </EthereumContext.Provider>
  );
};

// Define the hook for use within components
// Using a named constant function for better Fast Refresh compatibility
export const useEthereum = function useEthereum() {
  const context = useContext(EthereumContext);
  if (context === undefined) {
    throw new Error("useEthereum must be used within an EthereumProvider");
  }
  return context;
};
