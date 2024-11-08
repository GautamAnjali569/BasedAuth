import { getRpcClient, eth_call } from "thirdweb/rpc";
import { baseSepolia } from "thirdweb/chains";
import { Abi, encodeFunctionData, decodeFunctionResult } from "viem"; // Import decoding function
import config from "./config.json";
import { client } from "../app/client";

// Create an RPC client specific to Sepolia
const rpcRequest = getRpcClient({ client, chain: baseSepolia });

// Initialize the contract ABI and address
const contractAbi = config.BasedAuth.abi as Abi;
const contractAddress = config.BasedAuth.contractAddress;

// Function to fetch certifications metadata using `eth_call` and decode the result
export async function getCertificationsMetadata(certificationIds: bigint[]) {
  try {
    // Map through the certificationIds and fetch metadata using eth_call
    const certificationMetadata = await Promise.all(
      certificationIds.map(async (certId) => {
        // Encode the contract method call
        const data = encodeFunctionData({
          abi: contractAbi,
          functionName: "getCertificationData", // The function you want to call
          args: [certId], // The certification ID as an argument
        });

        // Make the raw eth_call request
        const result = await eth_call(rpcRequest, {
          to: contractAddress, // The contract address
          data: data, // Encoded function data
        });

        // Decode the result using decodeFunctionResult
        const decodedResult = decodeFunctionResult({
          abi: contractAbi,
          functionName: "getCertificationData", // The same function you called
          data: result, // The raw data returned from eth_call
        });

        return {
          certificationData: (decodedResult as [any])[0], // Decoded data
        };
      })
    );

    // Return fetched metadata
    return {
      certificationMetadata,
      isLoading: false,
    };
  } catch (error) {
    console.error("Error fetching certifications:", error);
    return {
      certificationMetadata: [],
      isLoading: false,
      error,
    };
  }
}
