// Non-essential utility script: Exports contract ABIs from Hardhat artifacts to frontend
// Purpose: Automates copying of compiled contract interfaces for TypeScript integration
import fs from "fs";
import path from "path";

const contracts = ["GameFactory", "TwoThirdsAverageGame"];

contracts.forEach((contractName) => {
  // Path to the compiled artifact
  const artifactPath = path.join(
    __dirname,
    `../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Destination path in the frontend
  const abiDir = path.join(__dirname, "../frontend/src/abi");

  // If it doesn't exist, create the folder
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Write (or overwrite) the ABI file in frontend
  fs.writeFileSync(
    path.join(abiDir, `${contractName}.json`),
    JSON.stringify(artifact.abi, null, 2)
  );
});
