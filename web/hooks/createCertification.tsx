import {
  getContract,
  prepareContractCall,
  prepareTransaction,
  sendTransaction,
  waitForReceipt,
  simulateTransaction,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";

const contract = getContract({
  address: config.BasedAuth.contractAddress,
  chain: baseSepolia,
  client,
  abi: config.BasedAuth.abi as Abi,
});

export async function createCertification(
  account: any,
  metadata: string,
  eligibleAddresses: string[]
) {
  const transaction = prepareContractCall({
    contract,
    method:
      "function createCertification(string metadata, address[] eligibleAddresses)",
    params: [metadata, eligibleAddresses],
  });

  const { transactionHash } = await sendTransaction({
    account,
    transaction,
  });

  return {
    transactionHash,
  };
}

export async function waitForCertificationReceipt(
  transactionHash: `0x${string}`
) {
  const receipt = await waitForReceipt({
    client,
    chain: baseSepolia,
    transactionHash,
  });

  return {
    receipt,
  };
}
