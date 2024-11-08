import { useWalletBalance } from "thirdweb/react";
import config from "./config.json";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import { formatUnits } from "viem";

const tokenAddress = config.USDC.contractAddress;

// Custom hook to get USDC balance
export function useUSDCBalance(tbaAccount: string | null) {
  // Always call the hook, but handle empty account cases inside the hook return
  const { data, isLoading, isError } = useWalletBalance({
    chain: baseSepolia,
    address: tbaAccount || "0x0000000000000000000000000000000000000000", // Use a placeholder if no account
    client,
    tokenAddress,
  });

  // If no valid account is provided, return default values
  if (!tbaAccount) {
    return { data: null, isLoading: false, isError: true };
  }

  //Format in the decimals of the token
  const formattedBalance = data
    ? formatUnits(data?.value ?? BigInt(0), data?.decimals ?? 18)
    : null;

  return { data: formattedBalance, isLoading, isError };
}
