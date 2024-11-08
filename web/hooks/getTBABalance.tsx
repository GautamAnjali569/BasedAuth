import { getRpcClient, eth_getBalance } from "thirdweb/rpc";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import { formatEther } from "viem";

const rpcRequest = getRpcClient({ client, chain: baseSepolia });

export async function getTBABalance(address: string) {
  const balance = await eth_getBalance(rpcRequest, {
    address: address,
  });
  const balanceInEth = formatEther(balance);
  return balanceInEth;
}
