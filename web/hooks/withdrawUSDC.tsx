import { getContract, prepareContractCall, encode, simulateTransaction } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";
import { sendCalls, getCallsStatus } from "thirdweb/wallets/eip5792";
import { Wallet } from "thirdweb/wallets";

const contract = getContract({
  address: config.BasedTreasury.contractAddress,
  chain: baseSepolia,
  client,
  abi: (config.BasedTreasury.abi as Abi) || (config.BasedAuth.abi as Abi),
});

export async function withdrawUSDC(wallet: Wallet, amount: bigint) {
  const transaction = prepareContractCall({
    contract,
    method: "function withdrawUsdc(uint256 amount)",
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

export async function waitForWithdrawReceipt(bundleId: string, wallet: Wallet) {
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
