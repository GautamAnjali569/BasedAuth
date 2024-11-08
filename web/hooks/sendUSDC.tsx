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
    abi:
      (config.ERC6551Account.abi as Abi) || (config.BasedTreasury.abi as Abi),
  });
};

export async function sendUSDC(
  wallet: Wallet,
  tbaAddress: string,
  recipient: string,
  amount: bigint
) {
  const contract = getTBAContract(tbaAddress);

  const transaction = prepareContractCall({
    contract,
    method:
      "function transferUsdcToAddress(address _usdcAddress, address _recipient, uint256 _amount)",
    params: [config.USDC.contractAddress, recipient, amount],
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

export async function waitForSendUSDCReceipt(bundleId: string, wallet: Wallet) {
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
