import { getContractEvents, prepareEvent, getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getRpcClient, eth_blockNumber } from "thirdweb/rpc";
import { client } from "../app/client";
import config from "./config.json";

const rpcRequest = getRpcClient({ client, chain: baseSepolia });

const studentRegistered = prepareEvent({
  signature:
    "event StudentRegistered(uint256 studentId,string metadata,address tbaAddress)",
});

export async function getTBACreationTx(tbaAddress: string) {
  const blockNumber = await eth_blockNumber(rpcRequest);

  const contract = getContract({
    client,
    address: config.BasedAuth.contractAddress,
    chain: baseSepolia,
  });

  const events = await getContractEvents({
    contract,
    fromBlock: blockNumber - BigInt(1000000),
    toBlock: blockNumber,
    events: [studentRegistered],
  });

  const studentRegisteredEvent = events.find(
    (event) => event.args.tbaAddress === tbaAddress
  );

  return studentRegisteredEvent;
}
