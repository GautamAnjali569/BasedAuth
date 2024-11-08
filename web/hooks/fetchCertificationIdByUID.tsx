import {
  getContractEvents,
  prepareEvent,
  getContract,
  resolveMethod,
} from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { getRpcClient, eth_blockNumber } from "thirdweb/rpc";
import { client } from "../app/client";
import config from "./config.json";

const rpcRequest = getRpcClient({ client, chain: baseSepolia });

const certificationClaimed = prepareEvent({
  signature:
    "event CertificationClaimed(uint256 certificationId, string cardUID, address studentTBA)",
});

export async function getCertifications(cardUID: string) {
  const blockNumber = await eth_blockNumber(rpcRequest);
  const certificationsIds: any[] = [];

  const contract = getContract({
    client,
    address: config.BasedAuth.contractAddress,
    chain: baseSepolia,
  });

  const events = await getContractEvents({
    contract,
    fromBlock: blockNumber - BigInt(1000000),
    toBlock: blockNumber,
    events: [certificationClaimed],
  });

  const certificationClaimedEvents = events
    .filter((event) => event.args.cardUID === cardUID)
    .filter(
      (event, index, self) =>
        index ===
        self.findIndex(
          (t) => t.args.certificationId === event.args.certificationId
        )
    );

  certificationClaimedEvents.forEach((event) => {
    certificationsIds.push(event.args.certificationId);
  });

  return certificationsIds;
}
