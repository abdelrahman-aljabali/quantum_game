import { ethers } from "ethers";
import dotenv from "dotenv";
import addresses from "../Frontend/src/addresses.json";
import GameFactoryABI from "../artifacts/contracts/GameFactory.sol/GameFactory.json";
import GameABI from "../artifacts/contracts/TwoThirdsAverageGame.sol/TwoThirdsAverageGame.json";

dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL;

  if (!privateKey || !rpcUrl) {
    throw new Error("Missing PRIVATE_KEY or RPC_URL in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("🔐 Running as:", wallet.address);

  // Attach to the factory
  const factory = new ethers.Contract(
    addresses.GameFactory,
    GameFactoryABI.abi,
    wallet
  );

  const games: string[] = await factory.getAllGames();
  console.log(`🎮 Found ${games.length} game(s)`);

  for (const addr of games) {
    const game = new ethers.Contract(addr, GameABI.abi, wallet);
    const pending = await game.getPendingWithdrawal(wallet.address);

    if (pending > 0n) {
      console.log(
        `💰 Withdrawing ${ethers.formatEther(pending)} ETH from game: ${addr}`
      );
      const tx = await game.withdraw();
      await tx.wait();
      console.log("✅ Withdrawn");
    } else {
      console.log(`🪙 No pending withdrawal from: ${addr}`);
    }
  }

  console.log("🏁 All withdrawals complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
