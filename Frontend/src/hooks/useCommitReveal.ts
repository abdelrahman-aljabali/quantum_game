// src/hooks/useCommitReveal.ts
import { useState } from "react";
import { ethers } from "ethers";
import { useEthereum } from "@/contexts/EthereumContext";

export function useCommitReveal() {
  const {
    submitNumber,
    revealNumber,
    hasSubmitted: contextSubmitted,
    hasRevealed: contextRevealed,
  } = useEthereum();

  const [number, setNumber] = useState(500);
  const [salt, setSalt] = useState("");

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  async function commit() {
    const saltBytes = ethers.id(salt);
    const hash = ethers.solidityPackedKeccak256(
      ["uint256", "bytes32"],
      [number, saltBytes]
    );

    await submitNumber(hash);

    localStorage.setItem("qc:number", number.toString());
    localStorage.setItem("qc:salt", saltBytes);
  }

  async function reveal() {
    const n = number || Number(localStorage.getItem("qc:number") || "0");
    const s = salt || localStorage.getItem("qc:salt") || ethers.id(""); // fallback

    await revealNumber(n, s);
    setHasRevealed(true);
  }

  return {
    number,
    setNumber,
    salt,
    setSalt,
    commit,
    reveal,
    hasSubmitted,
    setHasSubmitted,
    hasRevealed,
  };
}
