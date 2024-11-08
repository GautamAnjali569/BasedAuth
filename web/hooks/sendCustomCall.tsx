import {
  getContract,
  prepareContractCall,
  encode,
  simulateTransaction,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";
import { sendCalls, waitForBundle } from "thirdweb/wallets/eip5792";
import { Wallet } from "thirdweb/wallets";

const getTBAContract = (tbaAddress: string) => {
  return getContract({
    address: tbaAddress as `0x${string}`,
    chain: baseSepolia,
    client,
    abi: config.ERC6551Account.abi as Abi,
  });
};

export async function sendCustomCall(
  wallet: Wallet,
  tbaAddress: string,
  recipient: string,
  amount: bigint,
  data: string
) {
  const contract = getTBAContract(tbaAddress);

  console.log("contract", await wallet.getAccount()?.address);

  const transaction = prepareContractCall({
    contract,
    method:
      "function execute(address to, uint256 value, bytes calldata data, uint8 operation)",
    params: [recipient, amount, data as `0x${string}`, 0],
  });

  const encodedTx = await encode(transaction);

  const simulatedTx = await simulateTransaction({
    transaction: transaction,
    account: await wallet.getAccount(),
  });

  console.log("simulatedTx", simulatedTx);

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

export async function waitForSendCustomCallReceipt(bundleId: string, wallet: Wallet) {
  const result = await waitForBundle({
    client,
    chain: baseSepolia,
    wallet,
    bundleId,
  });

  return {
    status: result.status,
    receipts: result.receipts,
  };
}
