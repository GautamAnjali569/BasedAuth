import { getContract, prepareContractCall, encode, simulateTransaction } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";
import {
  sendCalls,
  getCallsStatus,
  waitForBundle,
} from "thirdweb/wallets/eip5792";
import { Wallet } from "thirdweb/wallets";

const getTBAContract = (tbaAddress: string) => {
  return getContract({
    address: tbaAddress as `0x${string}`,
    abi:
      (config.ERC6551Account.abi as Abi) || (config.BasedTreasury.abi as Abi),
    chain: baseSepolia,
    client,
  });
};

export async function swapETHToUSDC(
  wallet: Wallet,
  tbaAddress: string,
  amount: bigint
) {
  const contract = getTBAContract(tbaAddress);

  const transaction = prepareContractCall({
    contract,
    method: "function swapEthForUsdc(uint256 amount)",
    params: [amount],
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

export async function waitForSwapReceipt(bundleId: string, wallet: Wallet) {
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
