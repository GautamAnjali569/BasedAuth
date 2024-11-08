import {
  getContract,
  prepareContractCall,
  encode,
  simulateTransaction,
} from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../app/client";
import config from "./config.json";
import { Abi } from "thirdweb/utils";
import { encodeFunctionData, namehash } from "viem";
import { normalize } from "viem/ens";
import { Wallet } from "thirdweb/wallets";
import { sendCalls, getCallsStatus } from "thirdweb/wallets/eip5792";

const registrarContract = getContract({
  address: config.BaseNamesRegistrarControllerAddress.contractAddress,
  chain: base,
  client,
  abi: config.BaseNamesRegistrarControllerAddress.abi as Abi,
});

const l2ResolverContract = getContract({
  address: config.L2ResolverAddress.contractAddress,
  chain: base,
  client,
  abi: config.L2ResolverAddress.abi as Abi,
});

const baseNameRegex = /\.base\.eth$/;

function createRegisterContractMethodArgs(baseName: string, addressId: string) {
  console.log("Creating register contract method args", baseName, addressId);
  const addressData = encodeFunctionData({
    abi: l2ResolverContract.abi as Abi,
    functionName: "setAddr",
    args: [namehash(normalize(baseName)), addressId],
  });
  const nameData = encodeFunctionData({
    abi: l2ResolverContract.abi as Abi,
    functionName: "setName",
    args: [namehash(normalize(baseName)), baseName],
  });

  const registerArgs = {
    request: [
      baseName.replace(baseNameRegex, ""),
      addressId,
      BigInt(31557600),
      config.L2ResolverAddress.contractAddress,
      [addressData, nameData],
      true,
    ],
  };
  console.log(`Register contract method arguments constructed: `, registerArgs);

  return registerArgs;
}

export async function registerBasename(
  wallet: Wallet,
  baseName: string,
  addressId: string,
  value: number
) {
  console.log("Registering basename", baseName, addressId, value);
  const registerArgs = createRegisterContractMethodArgs(baseName, addressId);

  const transaction = prepareContractCall({
    contract: registrarContract,
    method:
      "function register((string,address,uint256,address,bytes[],bool) request)",
    params: [
      registerArgs.request as [
        string,
        string,
        bigint,
        string,
        readonly `0x${string}`[],
        boolean
      ],
    ],
    value: BigInt(value * 10 ** 18),
  });

  const encodedTx = await encode(transaction);

  const simulatedTx = await simulateTransaction({
    transaction: transaction,
  });

  const bundleId = await sendCalls({
    wallet,
    capabilities: {
      paymasterService: {
        url: `https://api.developer.coinbase.com/rpc/v1/base/UOVBVXh40714GuiJU058MF2eM2N2RpV_`,
      },
    },
    calls: [
      {
        to: registrarContract.address,
        data: encodedTx,
        chain: base,
        client,
        value: BigInt(value * 10 ** 18),
      },
    ],
  });

  return {
    bundleId,
  };
}

export async function waitForRegisterBasenameReceipt(
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
