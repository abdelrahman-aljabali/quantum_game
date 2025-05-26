/**
 * @fileoverview Hardhat Configuration for 2/3 Average Game DApp
 *
 * PURPOSE:
 * Configures the Hardhat development environment for smart contract
 * compilation, testing, and local blockchain simulation.
 *
 * KEY FEATURES:
 * - Solidity 0.8.28 with optimization for contract size
 * - Custom mining intervals for realistic game timing
 * - High gas limits to accommodate complex game logic
 * - Local network configuration for MetaMask integration
 *
 * NETWORK SETUP:
 * - hardhat: In-process network for testing
 * - localhost: External RPC for MetaMask/frontend connection
 * - Both use chainId 31337 for consistency
 *
 * OPTIMIZATION STRATEGY:
 * - Low optimizer runs (100) prioritize deployment cost over execution
 * - viaIR enables advanced optimization features
 * - High gas limits prevent transaction failures during complex operations
 */

// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

/**
 * @constant config
 * @description Main Hardhat configuration object
 *
 * SOLIDITY SETTINGS:
 * - Version 0.8.28: Latest stable with push0 opcode support
 * - Optimizer runs 100: Optimize for deployment size (academic/demo use)
 * - viaIR: Enable intermediate representation for better optimization
 *
 * NETWORK CONFIGURATION:
 * - hardhat: Development network with controlled mining
 * - localhost: External RPC endpoint for wallet integration
 * - 31337: Standard Hardhat chainId for development
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28", // Latest stable Solidity version
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      viaIR: true, // Enable advanced optimization via intermediate representation
    },
  },
  networks: {
    // In-process Hardhat network for testing
    hardhat: {
      chainId: 31337, // Standard development chain ID
      mining: {
        auto: false, // Manual mining for predictable timing
        interval: 1000, // Mine blocks every 5 seconds (realistic for game phases)
      },
      blockGasLimit: 30000000, // High limit for complex game transactions
    },
    // External RPC for MetaMask/frontend integration
    localhost: {
      url: "http://127.0.0.1:8545", // Standard Hardhat node RPC endpoint
      chainId: 31337, // Match hardhat network
      gas: 30000000, // High gas limit for transactions
      blockGasLimit: 30000000, // High block gas limit
    },
  },
};

export default config;

/*
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",

  networks: {
    // This config applies to both `npx hardhat node` and in‐process Hardhat network
    hardhat: {
      chainId: 31337,
      mining: {
        auto: false, // don't mine on every TX
        interval: 5_000, // mine one block every 5000 ms
      },
    },
    // So that `localhost` RPC also works if you point Metamask at it
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};

export default config;
 */
