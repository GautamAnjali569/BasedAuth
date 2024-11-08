import { getContractEvents, prepareEvent, getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getRpcClient, eth_blockNumber } from "thirdweb/rpc";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";

const rpcRequest = getRpcClient({ client, chain: baseSepolia });

const certificationCreated = prepareEvent({
  signature:
    "event Swapped(address indexed tba, uint256 ethAmount, uint256 usdcAmount)",
});

export async function fetchUSDCSwapped(tbaAddress: string) {
  const blockNumber = await eth_blockNumber(rpcRequest);

  const contract = getContract({
    client,
    address: config.BasedTreasury.contractAddress,
    chain: baseSepolia,
    abi:
      (config.ERC6551Account.abi as Abi) || (config.BasedTreasury.abi as Abi),
  });

  const events = await getContractEvents({
    contract,
    fromBlock: blockNumber - BigInt(1000000),
    toBlock: blockNumber,
    events: [certificationCreated],
  });

  // Find the most recent event for the given tbaAddress
  const mostRecentEvent = events
    .filter((event) => event.args.tba === tbaAddress)
    .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))[0];

  if (mostRecentEvent) {
    const usdcAmount = mostRecentEvent.args.usdcAmount;
    return Number(usdcAmount) / 10 ** 6;
  }

  return 0; // Return 0 if no events found for the given tbaAddress
}
