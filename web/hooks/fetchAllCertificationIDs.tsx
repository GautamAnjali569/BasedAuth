import { getContractEvents, prepareEvent, getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getRpcClient, eth_blockNumber } from "thirdweb/rpc";
import { client } from "../app/client";
import config from "./config.json";

const rpcRequest = getRpcClient({ client, chain: baseSepolia });

const certificationCreated = prepareEvent({
  signature:
    "event CertificationCreated(uint256 certificationId, string metadata, address[] eligibleAddresses)",
});

export async function fetchAllCertificationIDs() {
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
    events: [certificationCreated],
  });

  // Use a Set to automatically remove duplicates
  const uniqueCertificationIds = new Set(
    events.map((event) => event.args.certificationId.toString())
  );

  // Convert Set back to an array that also contains the transaction hash
  return Array.from(uniqueCertificationIds).map((id) => ({
    id,
    transaction: events.find(
      (event) => event.args.certificationId.toString() === id
    )?.transactionHash,
  }));
}
