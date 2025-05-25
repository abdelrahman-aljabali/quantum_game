/**
 * @fileoverview Ethereum Context - Central blockchain integration for 2/3 Average Game
 * 
 * ARCHITECTURE:
 * This context manages all blockchain interactions, wallet connections, and game state.
 * It provides a clean abstraction layer between React components and smart contracts.
 * 
 * KEY RESPONSIBILITIES:
 * - Wallet connection/disconnection via MetaMask
 * - Smart contract instantiation and method calls
 * - Real-time game state synchronization
 * - Event listening for contract updates
 * - Error handling and user feedback
 * 
 * DESIGN PATTERNS:
 * - Context API for global state management
 * - Observer pattern for blockchain events
 * - Pull-over-push for safe state updates
 * - Error boundaries for graceful failures
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ethers } from "ethers";

// Import deployed contract addresses and ABIs from build artifacts
import addresses from "../addresses.json";
import GameFactoryABI from "../abi/GameFactory.json";
import TwoThirdsAverageGameABI from "../abi/TwoThirdsAverageGame.json";

/**
 * @dev Game phases enum - MUST match exactly with Solidity contract
 * Used to track current game state and enable/disable UI features
 */
export enum GamePhase {
  WAITING_FOR_PLAYERS = 0,  // Accepting new players
  GAME_STARTING = 1,        // Grace period after min players reached
  COMMIT_PHASE = 2,         // Players submit encrypted guesses
  REVEAL_PHASE = 3,         // Players reveal original guesses
  EVALUATING_RESULTS = 4,   // Contract calculating winner
  GAME_ENDED = 5,           // Game complete, withdrawals available
}

// Player info from contract mapping
export interface PlayerInfo {
  address: string;
  hasCommitted: boolean;
  hasRevealed: boolean;
  revealedGuess: number;
}

export interface EthereumContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  gameFactoryContract: ethers.Contract | null;
  currentGameContract: ethers.Contract | null;
  currentGameAddress: string | null;
  gamePhase: GamePhase | null;
  playerCount: number;
  timeRemaining: number;
  entryFee: string | null;
  submissions: number[];
  winningNumber: number | null;
  winner: string | null;
  prizeAmount: string | null;
  hasJoined: boolean;
  hasSubmitted: boolean;
  hasRevealed: boolean;
  isFactoryOwner: boolean;
  players: PlayerInfo[];
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  resetGameUI: () => Promise<void>;
  leaveGame: () => Promise<void>;
  joinGame: () => Promise<void>;
  submitNumber: (hash: string) => Promise<void>;
  revealNumber: (guess: number, salt: string) => Promise<void>;
  withdrawPrize: () => Promise<void>;
  withdrawServiceFees: () => Promise<void>;
  refreshGameState: () => Promise<void>;
  advancePhase: () => Promise<void>;
  finalizeGameOnChain: () => Promise<void>;
  error: string | null;
}

const EthereumContext = createContext<EthereumContextType | undefined>(
  undefined
);

export const EthereumProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // --- Wallet / Provider State ---
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Contract Instances ---
  const [gameFactoryContract, setGameFactoryContract] =
    useState<ethers.Contract | null>(null);
  const [currentGameContract, setCurrentGameContract] =
    useState<ethers.Contract | null>(null);
  const [currentGameAddress, setCurrentGameAddress] = useState<string | null>(
    null
  );

  // --- Game State ---
  const [gamePhase, setGamePhase] = useState<GamePhase | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [entryFee, setEntryFee] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<number[]>([]);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [prizeAmount, setPrizeAmount] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [hasRevealed, setHasRevealed] = useState<boolean>(false);
  const [isFactoryOwner, setIsFactoryOwner] = useState<boolean>(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  // --- Initialize provider ---
  useEffect(() => {
    const initProvider = async () => {
      if ((window as any).ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(
            (window as any).ethereum
          );
          setProvider(browserProvider);
          const accounts = await browserProvider.listAccounts();
          if (accounts.length > 0) {
            const userSigner = await browserProvider.getSigner();
            setSigner(userSigner);
            setAccount(await userSigner.getAddress());
            const net = await browserProvider.getNetwork();
            setChainId(Number(net.chainId));
            setIsConnected(true);
          }
        } catch (e) {
          console.error("Provider init failed", e);
          setError("Failed to initialize provider");
        }
      } else {
        setError("Ethereum wallet not detected. Please install MetaMask.");
      }
    };
    initProvider();
  }, []);

  // --- Initialize contracts ---
  useEffect(() => {
    const initContracts = async () => {
      if (!provider || !signer) return;

      try {
        const network = await provider.getNetwork();
        const signerAddress = await signer.getAddress();

        console.log("▶️  Initializing contracts...");
        console.log("   • Network:", network.name, `(${network.chainId})`);
        console.log("   • Signer address:", signerAddress);
        console.log(
          "   • GameFactory address from addresses.json:",
          addresses.GameFactory
        );

        const factory = new ethers.Contract(
          addresses.GameFactory,
          GameFactoryABI,
          signer
        );
        setGameFactoryContract(factory);
        console.log("✅  GameFactory contract instantiated");

        // Fetch or create current game
        let gameAddr: string = await factory.currentGame();
        console.log("🔍  factory.currentGame():", gameAddr);

        if (!gameAddr || gameAddr === ethers.ZeroAddress) {
          console.log("⚠️  No current game found — deploying a new one...");
          const tx = await factory.createGame();
          await tx.wait();
          gameAddr = await factory.currentGame();
          console.log("✅  New game created at:", gameAddr);
        }

        setCurrentGameAddress(gameAddr);

        const game = new ethers.Contract(
          gameAddr,
          TwoThirdsAverageGameABI,
          signer
        );
        setCurrentGameContract(game);
        console.log("✅  Game contract instantiated at:", gameAddr);

        await fetchGameState();
        console.log("🔄  Game state fetched successfully");
      } catch (e: any) {
        console.error("❌  Contracts init failed:", e);
        setError("Contracts init error: " + (e?.message || "Unknown error"));
      }
    };

    if (isConnected) initContracts();
  }, [provider, signer, isConnected]);

  // --- Fetch game state ---
  const fetchGameState = async () => {
    if (!currentGameContract) return;
    try {
      // Phase & counts
      const rawPhase = await currentGameContract.getPhase();
      const phaseVal = Number(rawPhase.toString());
      setGamePhase(phaseVal);

      const rawCount = await currentGameContract.getPlayerCount();
      setPlayerCount(Number(rawCount.toString()));

      // Time remaining logic
      // AFTER: one line of truth from chain
      if (
        phaseVal === GamePhase.GAME_STARTING ||
        phaseVal === GamePhase.COMMIT_PHASE ||
        phaseVal === GamePhase.REVEAL_PHASE
      ) {
        const remaining = await currentGameContract.getTimeRemaining();
        setTimeRemaining(Number(remaining));
      } else {
        setTimeRemaining(0);
      }

      // Entry fee
      const rawFee = await currentGameContract.entryFee();
      setEntryFee(ethers.formatEther(rawFee));

      // Player-specific data
      if (account) {
        const pd = await currentGameContract.players(account);
        setHasJoined(pd.hasJoined);
        setHasSubmitted(pd.hasCommitted);
        setHasRevealed(pd.hasRevealed);
      }

      // All players info
      const addrs: string[] = await currentGameContract.getPlayers();
      const info: PlayerInfo[] = await Promise.all(
        addrs.map(async (addr) => {
          const d = await currentGameContract.players(addr);
          return {
            address: addr,
            hasCommitted: d.hasCommitted,
            hasRevealed: d.hasRevealed,
            revealedGuess: Number(d.revealedGuess.toString()),
          };
        })
      );
      setPlayers(info);
      setSubmissions(info.map((p) => p.revealedGuess));

      // Ended state
      if (phaseVal === GamePhase.GAME_ENDED) {
        const rawTwo = await currentGameContract.twoThirdsAverage();
        setWinningNumber(Number(rawTwo.toString()));
        const winAddr: string = await currentGameContract.winner();
        setWinner(winAddr);
        const rawPrize = await currentGameContract.prizePool();
        setPrizeAmount(ethers.formatEther(rawPrize));
      }

      // Factory owner check
      if (account && gameFactoryContract) {
        const ownerAddr: string = await gameFactoryContract.owner();
        setIsFactoryOwner(ownerAddr.toLowerCase() === account.toLowerCase());
      }
    } catch (e) {
      console.error("fetchGameState error", e);
    }
  };

  const refreshGameState = async () => {
    await fetchGameState();
  };

  // --- Phase‑advance helpers ---
  const advancePhase = async () => {
    if (!currentGameContract) return;
    try {
      const tx = await currentGameContract.catchUp();
      await tx.wait();
      await fetchGameState();
    } catch (e) {
      console.error("advancePhase error", e);
    }
  };

  const finalizeGameOnChain = async () => {
    if (!currentGameContract) return;
    try {
      const tx = await currentGameContract.finalizeGame();
      await tx.wait();
      await fetchGameState();
    } catch (e) {
      console.error("finalizeGame error", e);
    }
  };

  // --- Event listeners & polling ---
  useEffect(() => {
    if (!currentGameContract) return;
    const onPhase = (_from: any, to: any) => {
      setGamePhase(Number(to.toString()));
      fetchGameState();
    };
    const onPlayerJoined = () => fetchGameState();
    const onCommitted = () => fetchGameState();
    const onRevealed = () => fetchGameState();
    const onEnd = () => fetchGameState();
    const onWithdraw = () => fetchGameState();

    currentGameContract.on("PhaseAdvanced", onPhase);
    currentGameContract.on("PlayerJoined", onPlayerJoined);
    currentGameContract.on("GuessCommitted", onCommitted);
    currentGameContract.on("GuessRevealed", onRevealed);
    currentGameContract.on("GameEnded", onEnd);
    currentGameContract.on("Withdrawal", onWithdraw);

    const interval = setInterval(fetchGameState, 5000);
    return () => {
      clearInterval(interval);
      currentGameContract.off("PhaseAdvanced", onPhase);
      currentGameContract.off("PlayerJoined", onPlayerJoined);
      currentGameContract.off("GuessCommitted", onCommitted);
      currentGameContract.off("GuessRevealed", onRevealed);
      currentGameContract.off("GameEnded", onEnd);
      currentGameContract.off("Withdrawal", onWithdraw);
    };
  }, [currentGameContract]);

  // --- Wallet event listeners ---
  useEffect(() => {
    if (!(window as any).ethereum) return;
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        if (provider) {
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
          setAccount(accounts[0]);
          setIsConnected(true);
          fetchGameState();
        }
      }
    };
    const handleChainChanged = () => window.location.reload();

    (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
    (window as any).ethereum.on("chainChanged", handleChainChanged);

    return () => {
      (window as any).ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      (window as any).ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [account, provider]);

  // --- Actions (connect/join/submit/etc.) ---
  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      setError("Ethereum wallet not detected. Please install MetaMask.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const browserProvider = new ethers.BrowserProvider(
        (window as any).ethereum
      );
      await browserProvider.send("eth_requestAccounts", []);
      const userSigner = await browserProvider.getSigner();
      const userAddress = await userSigner.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(userSigner);
      setAccount(userAddress);
      setChainId(Number(network.chainId));
      setIsConnected(true);
    } catch (e: any) {
      console.error("connectWallet error", e);
      setError(e.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

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
    setHasRevealed(false);
  };

  const joinGame = async () => {
    if (!isConnected || !gameFactoryContract) {
      setError("Please connect your wallet first");
      return;
    }
    try {
      setError(null);
      if (!currentGameContract) {
        const tx = await gameFactoryContract.createGame();
        await tx.wait();
        const newAddr = await gameFactoryContract.currentGame();
        setCurrentGameAddress(newAddr);
        const game = new ethers.Contract(
          newAddr,
          TwoThirdsAverageGameABI,
          signer!
        );
        setCurrentGameContract(game);
      }
      if (hasJoined) {
        setError("You have already joined this game");
        return;
      }
      const phaseVal = gamePhase;
      if (
        phaseVal !== GamePhase.WAITING_FOR_PLAYERS &&
        phaseVal !== GamePhase.GAME_STARTING
      ) {
        setError("Cannot join game at this phase");
        return;
      }
      const rawFee = await currentGameContract!.entryFee();
      const tx = await currentGameContract!.joinGame({ value: rawFee });
      await tx.wait();
      setHasJoined(true);
      fetchGameState();
    } catch (e: any) {
      console.error("joinGame error", e);
      setError(e.message || "Failed to join game");
    }
  };

  const submitNumber = async (hash: string) => {
    if (!isConnected || !currentGameContract) {
      setError("Please connect your wallet first");
      return;
    }
    if (!hasJoined) {
      setError("You must join before committing");
      return;
    }
    if (hasSubmitted) {
      setError("You have already committed a guess");
      return;
    }
    if (gamePhase !== GamePhase.COMMIT_PHASE) {
      setError("Commit phase is not open");
      return;
    }
    try {
      setError(null);
      const tx = await currentGameContract.commitGuess(hash);
      await tx.wait();
      setHasSubmitted(true);
      fetchGameState();
    } catch (e: any) {
      console.error("commitGuess error", e);
      setError(e.message || "Failed to commit guess");
    }
  };

  const revealNumber = async (guess: number, salt: string) => {
    if (!isConnected || !currentGameContract) {
      setError("Please connect your wallet first");
      return;
    }
    if (!hasJoined || !hasSubmitted) {
      setError("Commit phase must be completed before revealing");
      return;
    }
    if (hasRevealed) {
      setError("You have already revealed your guess");
      return;
    }
    if (gamePhase !== GamePhase.REVEAL_PHASE) {
      setError("Reveal phase is not open");
      return;
    }
    try {
      setError(null);
      const saltBytes = ethers.id(salt);
      const tx = await currentGameContract.revealGuess(guess, saltBytes);
      await tx.wait();
      setHasRevealed(true);
      fetchGameState();
    } catch (e: any) {
      console.error("revealGuess error", e);
      setError(e.message || "Failed to reveal guess");
    }
  };

  const withdrawPrize = async () => {
    if (!isConnected || !currentGameContract) {
      setError("Please connect your wallet first");
      return;
    }
    if (winner?.toLowerCase() !== account?.toLowerCase()) {
      setError("Only the winner can withdraw the prize");
      return;
    }
    try {
      setError(null);
      const tx = await currentGameContract.withdraw();
      await tx.wait();
      fetchGameState();
    } catch (e: any) {
      console.error("withdraw error", e);
      setError(e.message || "Failed to withdraw prize");
    }
  };

  const leaveGame = async () => {
    if (!isConnected || !currentGameContract) {
      setError("Please connect your wallet first");
      return;
    }
    if (!hasJoined) {
      setError("You have not joined the game");
      return;
    }
    try {
      setError(null);
      const tx = await currentGameContract.leaveGame();
      await tx.wait();
      setHasJoined(false);
      await fetchGameState();
    } catch (e: any) {
      console.error("leaveGame error", e);
      setError(e.message || "Failed to leave game");
    }
  };

  const withdrawServiceFees = async () => {
    if (!isConnected || !currentGameContract) {
      setError("Please connect your wallet first");
      return;
    }
    if (!isFactoryOwner) {
      setError("Only factory owner can withdraw service fees");
      return;
    }
    try {
      setError(null);
      const tx = await currentGameContract.withdraw();
      await tx.wait();
      fetchGameState();
    } catch (e: any) {
      console.error("withdrawFees error", e);
      setError(e.message || "Failed to withdraw service fees");
    }
  };

  const resetGameUI = async () => {
    try {
      console.log("🔄 Resetting game UI...");

      // 1. Safely remove all event listeners from the previous game contract
      if (currentGameContract) {
        console.log(
          "❌ Removing old listeners from:",
          currentGameContract.target
        );
        currentGameContract.removeAllListeners();
      }

      // 2. Reset all frontend state to default values
      setCurrentGameContract(null);
      setCurrentGameAddress(null);
      setGamePhase(null);
      setPlayerCount(0);
      setTimeRemaining(0);
      setEntryFee(null);
      setSubmissions([]);
      setWinningNumber(null);
      setWinner(null);
      setPrizeAmount(null);
      setHasJoined(false);
      setHasSubmitted(false);
      setHasRevealed(false);
      setPlayers([]);
      setError(null);

      // 3. Log current state
      console.log("✅ Frontend state reset complete.");
    } catch (error) {
      console.error("❌ Error resetting game UI:", error);
      setError("Something went wrong while resetting the game UI.");
    }
  };

  const value: EthereumContextType = {
    provider,
    signer,
    account,
    chainId,
    leaveGame,
    isConnected,
    isConnecting,
    gameFactoryContract,
    currentGameContract,
    currentGameAddress,
    gamePhase,
    playerCount,
    timeRemaining,
    resetGameUI,
    entryFee,
    submissions,
    winningNumber,
    winner,
    prizeAmount,
    hasJoined,
    hasSubmitted,
    hasRevealed,
    isFactoryOwner,
    players,
    connectWallet,
    disconnectWallet,
    joinGame,
    submitNumber,
    revealNumber,
    withdrawPrize,
    withdrawServiceFees,
    refreshGameState,
    advancePhase,
    finalizeGameOnChain,
    error,
  };

  return (
    <EthereumContext.Provider value={value}>
      {children}
    </EthereumContext.Provider>
  );
};

export const useEthereum = (): EthereumContextType => {
  const ctx = useContext(EthereumContext);
  if (!ctx) throw new Error("useEthereum must be used within EthereumProvider");
  return ctx;
};
