import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  // Deploy GameFactory
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy();
  await gameFactory.waitForDeployment();

  const gameFactoryAddress = await gameFactory.getAddress();
  console.log(`GameFactory deployed to: ${gameFactoryAddress}`);

  // Set default parameters if needed
  // Uncomment and modify if you want to change the default parameters
  /*
  const tx1 = await gameFactory.setDefaultParameters(
    3, // minPlayers
    15, // maxPlayers
    120, // submissionDuration (2 minutes)
    ethers.parseEther("0.01"), // entryFee (0.01 ETH)
    5, // serviceFeePercent (5%)
    60 // autoStartDelay (1 minute)
  );
  await tx1.wait();
  console.log("Default parameters updated");
  */

  // Create a game instance with default parameters
  const tx2 = await gameFactory.createGame();
  await tx2.wait();

  const currentGame = await gameFactory.currentGame();
  console.log(`First game created at: ${currentGame}`);

  // Get the TwoThirdsAverageGame contract instance
  const TwoThirdsAverageGame = await ethers.getContractFactory(
    "TwoThirdsAverageGame",
  );
  const gameInstance = TwoThirdsAverageGame.attach(currentGame);

  // Log game parameters
  const minPlayers = await gameInstance.minPlayers();
  const maxPlayers = await gameInstance.maxPlayers();
  const submissionDuration = await gameInstance.submissionDuration();
  const entryFee = await gameInstance.entryFee();
  const serviceFeePercent = await gameInstance.serviceFeePercent();
  const autoStartDelay = await gameInstance.autoStartDelay();

  console.log("Game parameters:");
  console.log(`- Min Players: ${minPlayers}`);
  console.log(`- Max Players: ${maxPlayers}`);
  console.log(`- Submission Duration: ${submissionDuration} seconds`);
  console.log(`- Entry Fee: ${ethers.formatEther(entryFee)} ETH`);
  console.log(`- Service Fee: ${serviceFeePercent}%`);
  console.log(`- Auto Start Delay: ${autoStartDelay} seconds`);

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
