import { getContract, resolveMethod } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { useReadContract } from "thirdweb/react";
import config from "./config.json";
import { client } from "../app/client";
import { Abi } from "thirdweb/utils";

const contract = getContract({
  client,
  address: config.BasedAuth.contractAddress,
  chain: baseSepolia,
  abi: config.BasedAuth.abi as Abi,
});

export function getBasedAuthAdmin() {
  const { data: admin, isLoading } = useReadContract({
    contract,
    // @ts-ignore
    method: resolveMethod("admin_"),
    params: [],
  });

  return { admin, isLoading };
}
