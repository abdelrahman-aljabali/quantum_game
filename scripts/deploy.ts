/**
 * @fileoverview Contract Deployment Script for 2/3 Average Game DApp
 * 
 * PURPOSE:
 * Deploys the GameFactory contract to the specified network and saves
 * deployment addresses for frontend integration.
 * 
 * DEPLOYMENT STRATEGY:
 * 1. Deploy GameFactory contract (creates/manages individual games)
 * 2. Optional: Configure default game parameters
 * 3. Optional: Create initial game instance (disabled for gas optimization)
 * 4. Save contract addresses to frontend addresses.json
 * 
 * NETWORK SUPPORT:
 * - Local Hardhat network (development)
 * - Localhost test network
 * - Testnet deployment (Sepolia, Goerli)
 * - Mainnet deployment (with careful gas settings)
 * 
 * USAGE:
 * npx hardhat run scripts/deploy.ts --network localhost
 * npx hardhat run scripts/deploy.ts --network sepolia
 */

// scripts/deploy.ts

import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

/**
 * @function main
 * @description Main deployment function with comprehensive error handling
 * 
 * DEPLOYMENT STEPS:
 * 1. Deploy GameFactory (factory pattern for game creation)
 * 2. Configure default parameters (entry fee, timers, etc.)
 * 3. Create initial game instance (optional, saves gas for users)
 * 4. Export addresses for frontend consumption
 */
async function main() {
  console.log("📦  Deploying GameFactory …");

  /* ------------------------------------------------------------------
   * 1. Deploy the GameFactory contract
   * ---------------------------------------------------------------- */
  const Factory = await ethers.getContractFactory("GameFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const factoryAddr = await factory.getAddress();
  console.log(`🛠  GameFactory deployed to: ${factoryAddr}`);

  /* ------------------------------------------------------------------
   * 2. (Optional) tweak factory default parameters
   * ---------------------------------------------------------------- */
  // await factory.setDefaultParameters(
  //   3,                         // minPlayers
  //   15,                        // maxPlayers
  //   180,                       // commitDuration (sec)
  //   180,                       // revealDuration (sec)
  //   ethers.parseEther("0.01"),// entryFee
  //   5,                         // serviceFeePercent
  //   120                        // autoStartDelay (sec)
  // );
  // console.log("🔧  Factory defaults updated");

  /* ------------------------------------------------------------------
   * 3. Create a game instance (DISABLED to prevent gas limit issues)
   * ---------------------------------------------------------------- */
  // const tx = await factory.createGame();
  // const rc = await tx.wait();

  // const gameCreatedEvent = rc!.logs
  //   .map((l) => {
  //     try {
  //       return factory.interface.parseLog(l);
  //     } catch {
  //       return null;
  //     }
  //   })
  //   .find((e) => e?.name === "GameCreated");

  // const gameAddr = gameCreatedEvent?.args?.gameAddress;
  // if (!gameAddr) throw new Error("GameCreated event not found.");

  // console.log(`🎲  First game created at: ${gameAddr}`);

  // const Game = await ethers.getContractAt("TwoThirdsAverageGame", gameAddr);
  // const [
  //   minPlayers,
  //   maxPlayers,
  //   commitDur,
  //   revealDur,
  //   entryFee,
  //   serviceFee,
  //   autoStart,
  // ] = await Promise.all([
  //   Game.minPlayers(),
  //   Game.maxPlayers(),
  //   Game.commitDuration(),
  //   Game.revealDuration(),
  //   Game.entryFee(),
  //   Game.serviceFeePercent(),
  //   Game.autoStartDelay(),
  // ]);

  // console.log("📑  Game parameters:");
  // console.log(`   • Min players       : ${minPlayers}`);
  // console.log(`   • Max players       : ${maxPlayers}`);
  // console.log(`   • Commit duration   : ${commitDur} s`);
  // console.log(`   • Reveal duration   : ${revealDur} s`);
  // console.log(`   • Entry fee         : ${ethers.formatEther(entryFee)} ETH`);
  // console.log(`   • Service fee       : ${serviceFee}%`);
  // console.log(`   • Auto‑start delay  : ${autoStart} s`);

  /* ------------------------------------------------------------------
   * 4. Save the deployed addresses to frontend
   * ---------------------------------------------------------------- */
  const out = {
    GameFactory: factoryAddr,
    // TwoThirdsAverageGame: gameAddr, // Enable if you deploy game later
  };

  const outPath = path.join(__dirname, "../Frontend/src/addresses.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("📝  Saved addresses ➜", outPath);

  console.log("✅  Deployment completed successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
