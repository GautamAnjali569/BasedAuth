import {
  getContract,
  prepareContractCall,
  prepareTransaction,
  sendTransaction,
  waitForReceipt,
  simulateTransaction,
  resolveMethod,
  encode,
} from "thirdweb";
import { useSendCalls, useCallsStatus } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";

const getTBAContract = (tbaAddress: string) => {
  return getContract({
    address: tbaAddress as `0x${string}`,
    abi: (config.BasedAuth.abi as Abi) || (config.ERC6551Account.abi as Abi),
    chain: baseSepolia,
    client,
  });
};

export async function claimCertification(
  tbaAddress: string,
  certificationId: bigint
) {
  const contract = getTBAContract(tbaAddress);

  const transaction = prepareContractCall({
    contract,
    method: "function claimCertification(uint256 certificationId)",
    params: [certificationId],
  });

  const encodedTx = await encode(transaction);

  const { mutate: sendCalls, data: bundleId } = useSendCalls({
    client,
    waitForResult: true,
  });

  await sendCalls({
    capabilities: {
      paymasterService: {
        url: `https://84532.bundler.thirdweb.com/${client.clientId}`,
      },
    },
    calls: [
      {
        to: contract.address,
        data: encodedTx,
        chain: baseSepolia,
        client,
      },
    ],
  });

  return {
    bundleId,
  };
}

export async function waitForClaimReceipt(bundleId: string) {
  const { data: status, isLoading } = useCallsStatus({
    client,
    bundleId,
  });

  return {
    status,
    isLoading,
  };
}
