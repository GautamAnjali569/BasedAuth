import { getRpcClient, eth_call } from "thirdweb/rpc";
import { baseSepolia } from "thirdweb/chains";
import { Abi, encodeFunctionData, decodeFunctionResult } from "viem"; // Import encoding and decoding functions
import config from "./config.json";
import { client } from "../app/client";

// Create an RPC client specific to Sepolia
const rpcRequest = getRpcClient({ client, chain: baseSepolia });

// Function to make a custom read call
export async function readCustomCall(
  address: string, // Contract address
  method: string, // Method name from the ABI
  params: any[], // Parameters for the method
  abi: Abi // ABI of the contract
) {
  try {
    // Encode the contract method call with the provided ABI and parameters
    const data = encodeFunctionData({
      abi: abi,
      functionName: method, // The function name
      args: params, // The parameters for the function
    });

    // Make the eth_call request
    const result = await eth_call(rpcRequest, {
      to: address, // The contract address
      data: data, // Encoded function data
    });

    // Decode the result using decodeFunctionResult
    const decodedResult = decodeFunctionResult({
      abi: abi,
      functionName: method, // The same function name
      data: result, // The raw data returned from eth_call
    });

    // Return the decoded result
    return {
      result: decodedResult,
      isLoading: false,
    };
  } catch (error) {
    console.error("Error in readCustomCall:", error);
    return {
      result: null,
      isLoading: false,
      error,
    };
  }
}
