import { useWalletBalance } from "thirdweb/react";
import config from "./config.json";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import { formatUnits } from "viem";

const tokenAddress = config.USDC.contractAddress;

// Custom hook to get USDC balance
export function useUSDCBalance() {
  // Always call the hook, but handle empty account cases inside the hook return
  const { data, isLoading, isError } = useWalletBalance({
    chain: baseSepolia,
    address: config.BasedTreasury.contractAddress,
    client,
    tokenAddress,
  });

  //Format in the decimals of the token
  const formattedBalance = data
    ? formatUnits(data?.value ?? BigInt(0), data?.decimals ?? 18)
    : null;

  return { data: formattedBalance, isLoading, isError };
}
