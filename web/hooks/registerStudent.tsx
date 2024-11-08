import {
  getContract,
  prepareContractCall,
  prepareTransaction,
  sendTransaction,
  waitForReceipt,
  simulateTransaction,
  encode,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";
import { sendCalls, getCallsStatus } from "thirdweb/wallets/eip5792";
import { Wallet } from "thirdweb/wallets";

const contract = getContract({
  address: config.BasedAuth.contractAddress,
  chain: baseSepolia,
  client,
  abi: config.BasedAuth.abi as Abi,
});

export async function registerStudent(
  wallet: Wallet,
  cardUID: string,
  studentId: bigint,
  metadata: string
) {
  const transaction = prepareContractCall({
    contract,
    method:
      "function registerStudentRequest(string cardUID, uint256 studentId, string metadata)",
    params: [cardUID, studentId, metadata],
  });

  const encodedTx = await encode(transaction);

  const simulatedTx = await simulateTransaction({
    transaction: transaction,
    account: await wallet.getAccount(),
  });

  const bundleId = await sendCalls({
    wallet,
    capabilities: {
      paymasterService: {
        url: `https://api.developer.coinbase.com/rpc/v1/base-sepolia/UOVBVXh40714GuiJU058MF2eM2N2RpV_`,
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

export async function waitForRegStudentReceipt(
  bundleId: string,
  wallet: Wallet
) {
  const status = await getCallsStatus({
    wallet,
    client,
    bundleId,
  });

  if (status.status === "CONFIRMED") {
    return {
      status,
    };
  }

  return null;
}
