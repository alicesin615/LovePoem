import React from "react";
import { Button } from "@components/button";
import { ethers } from "ethers";
import { useState } from "react";
import { shortenString } from "@utils/string.formatter";

export function WalletButton() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");

  async function connectWallet() {
    let signer: ethers.Signer;
    let provider: ethers.providers.Web3Provider;

    // No metamask installed
    if (!window.ethereum) {
      return;
    }

    // Metamask installed - connect & disconnect
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    if (!isConnected) {
      try {
        setLoading(true);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const _walletAddress = await signer.getAddress();

        setLoading(false);
        setIsConnected(true);
        setWalletAddress(_walletAddress);
      } catch (error) {
        console.log("Error: ", error);
      }
    } else {
      provider.on("disconnect", () => {
        setIsConnected(false);
        setWalletAddress("");
      });
    }
  }
  return (
    <Button
      onPress={() => connectWallet()}
      isLoading={isLoading}
      variant={isConnected ? "bordered" : "solid"}
      rounded
    >
      {isConnected ? shortenString(walletAddress, 4) : "Connect Wallet"}
    </Button>
  );
}
