import { ethers } from "hardhat";
import addresses from "../../frontend/src/addresses.json"; // or wherever you store them

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("🔐 Running as:", owner.address);

  // Attach to the factory
  const factory = await ethers.getContractAt(
    "GameFactory",
    addresses.GameFactory
  );

  const games: string[] = await factory.getAllGames();
  console.log(`🎮 Found ${games.length} game(s)`);

  for (const addr of games) {
    const game = await ethers.getContractAt("TwoThirdsAverageGame", addr);
    const pending = await game.getPendingWithdrawal(owner.address);

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
