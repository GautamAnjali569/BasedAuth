"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { readCustomCall } from "@/hooks/readCustomCall"; // Import the refactored read function
import {
  sendCustomCall,
  waitForSendCustomCallReceipt,
} from "@/hooks/sendCustomCall";
import { useActiveWallet } from "thirdweb/react"; // assuming wallet is already managed in your app
import { getStudentData } from "@/hooks/getStudentData";
import { usePathname } from "next/navigation";

const StudentInteraction: React.FC = () => {
  const [contractAddress, setContractAddress] = useState<string>(""); // State to store user input contract address
  const [contractAbi, setContractAbi] = useState<any[]>([]); // State to store fetched ABI
  const [functionInputs, setFunctionInputs] = useState<any>({}); // State to store function inputs
  const [functionStatuses, setFunctionStatuses] = useState<{
    [key: string]: string | null;
  }>({}); // State to store transaction status for each function
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(false); // State to manage loading status
  const [isError, setIsError] = useState<{ [key: string]: boolean }>({}); // To track error state for each function
  const [studentData, setStudentData] = useState<string[] | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const slug = usePathname();
  const cardUID = slug?.split("/")[2];

  const { studentData: data, isLoading: isContractLoading } =
    getStudentData(cardUID);
  const wallet = useActiveWallet();

  useEffect(() => {
    if (
      !isContractLoading &&
      data !== undefined &&
      Object.keys(data).length > 0
    ) {
      setStudentData(data as string[]);
      setIsLoading(false);
    }
  }, [data, isContractLoading]);

  // Fetch contract ABI from BaseScan API
  const fetchContractAbi = async (address: string) => {
    try {
      // Clear previous states before fetching new ABI
      setContractAbi([]); // Clear ABI
      setFunctionStatuses({}); // Clear previous statuses
      setFunctionInputs({}); // Clear function inputs

      setIsFetchingAbi(true);
      const response = await axios.get(
        `https://api-sepolia.basescan.org/api?module=contract&action=getabi&address=${address}&apikey=YourApiKeyToken`
      );
      if (response.data.status === "1") {
        const abi = JSON.parse(response.data.result);
        setContractAbi(abi); // Store the fetched ABI
      } else {
        throw new Error("Failed to fetch ABI.");
      }
    } catch (error) {
      console.error("Error fetching ABI:", error);
    } finally {
      setIsFetchingAbi(false);
    }
  };

  // Handle input change for contract address
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContractAddress(e.target.value);
  };

  // Handle fetching ABI when the user clicks the button
  const handleFetchAbi = () => {
    if (contractAddress) {
      fetchContractAbi(contractAddress);
    } else {
      alert("Please enter a valid contract address.");
    }
  };

  // Handle input change for function arguments
  const handleInputChange = (
    functionName: string,
    paramIndex: number,
    value: string
  ) => {
    setFunctionInputs((prevState: any) => ({
      ...prevState,
      [functionName]: {
        ...prevState[functionName],
        [paramIndex]: value,
      },
    }));
  };

  // Helper function to safely convert result objects containing BigInt to strings
  const convertBigIntToString = (obj: any): any => {
    if (typeof obj === "bigint") {
      return obj.toString();
    } else if (Array.isArray(obj)) {
      return obj.map(convertBigIntToString);
    } else if (typeof obj === "object" && obj !== null) {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          convertBigIntToString(value),
        ])
      );
    }
    return obj;
  };

  // Handle function call (read or write)
  const handleFunctionCall = async (
    func: any, // ABI function details
    functionName: string,
    inputs: any[],
    inputsArray: any[]
  ) => {
    if (!inputsArray.every((input) => input)) {
      setFunctionStatuses((prevState) => ({
        ...prevState,
        [functionName]: "Please fill in all required inputs.",
      }));
      setIsError((prevState) => ({ ...prevState, [functionName]: true }));
      return;
    }

    try {
      // Distinguish between read and write functions based on `stateMutability`
      if (func.stateMutability === "view" || func.stateMutability === "pure") {
        // Read-only function
        const { result, isLoading } = await readCustomCall(
          contractAddress,
          functionName,
          inputsArray,
          contractAbi
        );

        console.log("result", result);

        if (isLoading) {
          setFunctionStatuses((prevState) => ({
            ...prevState,
            [functionName]: "Loading...",
          }));
        } else {
          const safeResult = convertBigIntToString(result); // Safely convert BigInt to string
          setFunctionStatuses((prevState) => ({
            ...prevState,
            [functionName]: `Result: ${JSON.stringify(safeResult)}`,
          }));
        }
      } else {
        const iface = new ethers.utils.Interface(contractAbi);
        const data = iface.encodeFunctionData(functionName, inputsArray);

        const receipt = await sendCustomCall(
          wallet!,
          studentData?.[2] as string,
          contractAddress,
          BigInt(0),
          data
        );

        //wait for receipt
        const { status, receipts } = await waitForSendCustomCallReceipt(
          receipt.bundleId,
          wallet!
        );

        setFunctionStatuses((prevState) => ({
          ...prevState,
          [functionName]: `Transaction successful: ${receipts[0].transactionHash}`,
        }));
        setIsError((prevState) => ({ ...prevState, [functionName]: false }));
      }
    } catch (error) {
      console.error("Function call failed:", error);
      setFunctionStatuses((prevState) => ({
        ...prevState,
        [functionName]: "Transaction failed.",
      }));
      setIsError((prevState) => ({ ...prevState, [functionName]: true }));
    }
  };

  return (
    <div className="mb-20">
      <h1 className="text-2xl font-bold mb-4">Interact with ANY Smart Contract on BASE</h1>

      {/* Input for contract address */}
      <div className="mb-4 flex flex-col lg:flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Enter contract address"
          value={contractAddress}
          onChange={handleAddressChange}
          className="w-full lg:w-2/3 p-2 rounded bg-neutral-900 border-2 border-white"
        />
        <button
          onClick={handleFetchAbi}
          className="lg:w-1/3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Fetch Contract ABI
        </button>
      </div>

      {/* Loading spinner or message */}
      {isFetchingAbi && <div className="text-yellow-400">Fetching ABI...</div>}

      {/* List contract functions once ABI is fetched */}
      {contractAbi.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contractAbi
            .filter((item) => item.type === "function") // Only show functions
            .map((func, index) => (
              <div
                key={index}
                className="p-6 bg-neutral-900 text-white rounded-lg shadow-lg flex flex-col items-start space-y-4"
              >
                <h2 className="text-xl font-bold">{func.name}</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleFunctionCall(
                      func,
                      func.name,
                      func.inputs,
                      Object.values(functionInputs[func.name] || {})
                    );
                  }}
                >
                  {/* Display input fields for each function argument */}
                  {func.inputs.map((input: any, paramIndex: number) => (
                    <div key={paramIndex} className="mb-2">
                      <label className="block text-sm font-medium mb-1">
                        {input.name || `Input ${paramIndex + 1}`} ({input.type})
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md bg-neutral-800 border-neutral-600"
                        value={functionInputs[func.name]?.[paramIndex] || ""}
                        onChange={(e) =>
                          handleInputChange(
                            func.name,
                            paramIndex,
                            e.target.value
                          )
                        }
                        placeholder={`Enter ${
                          input.name || `arg ${paramIndex + 1}`
                        }`}
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    className="w-full px-4 py-2 mt-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Call {func.name}
                  </button>
                </form>

                {/* Display status for this specific function */}
                {functionStatuses[func.name] && (
                  <div className="mt-2 p-4 bg-gray-800 rounded-md w-full">
                    <p
                      className={`${
                        isError[func.name] ? "text-red-400" : "text-green-400"
                      } break-words`}
                    >
                      {functionStatuses[func.name]}
                    </p>
                    {!isError[func.name] &&
                      functionStatuses[func.name]?.startsWith(
                        "Transaction successful"
                      ) && (
                        <button
                          onClick={() =>
                            window.open(
                              `https://sepolia.basescan.org/tx/${
                                functionStatuses[func.name]?.split(": ")[1]
                              }`,
                              "_blank"
                            )
                          }
                          className="text-blue-500 underline mt-2 block"
                        >
                          View Transaction on BaseScan
                        </button>
                      )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default StudentInteraction;
