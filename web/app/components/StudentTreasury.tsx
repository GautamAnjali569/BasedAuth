"use client";
import React, { useEffect, useState } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import axios from "axios";
import { HoverEffect } from "./ui/card-hover-effect";
import { getTBABalance } from "@/hooks/getTBABalance";
import { getStudentData } from "@/hooks/getStudentData";
import { usePathname } from "next/navigation";
import { swapETHToUSDC, waitForSwapReceipt } from "@/hooks/swapETHToUSDC";
import { useUSDCBalance } from "@/hooks/getUSDCBalance";
import { sendUSDC, waitForSendUSDCReceipt } from "@/hooks/sendUSDC";
import { AxiosError } from "axios";
import { fetchUSDCSwapped } from "@/hooks/fetchUSDCSwapped";
import {
  resolveAddress,
  BASENAME_RESOLVER_ADDRESS,
} from "thirdweb/extensions/ens";
import { base } from "thirdweb/chains";
import { client } from "../client";
import { Wallet } from "thirdweb/wallets";

const StudentTreasury = () => {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const [ethToUsdRate, setEthToUsdRate] = useState(0);
  const [recipientBasename, setRecipientBasename] = useState("");
  const [amountToSend, setAmountToSend] = useState("");
  const [amountToSwap, setAmountToSwap] = useState(""); // For ETH to USDC swap amount
  const [usdcEquivalent, setUsdcEquivalent] = useState(0); // For showing USDC equivalent
  const [tbaBalance, setTbaBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null); // USDC balance state
  const [isLoading, setIsLoading] = useState(true);
  const [studentData, setStudentData] = useState<string[] | undefined>(
    undefined
  );
  const [swapStatus, setSwapStatus] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null); // For send status messages
  const slug = usePathname();
  const cardUID = slug?.split("/")[2];
  const [swapTransactionHash, setSwapTransactionHash] = useState<string | null>(
    null
  );
  const [swapBundleId, setSwapBundleId] = useState<string | null>(null);
  const [swapReceipt, setSwapReceipt] = useState<any | null>(null);
  const [sendUSDCTransactionHash, setSendUSDCTransactionHash] = useState<
    string | null
  >(null);
  const [sendBundleId, setSendBundleId] = useState<string | null>(null);
  const [sendUSDCReceipt, setSendUSDCReceipt] = useState<any | null>(null);
  const { studentData: data, isLoading: isContractLoading } =
    getStudentData(cardUID);

  const { data: usdcData, isLoading: isUSDCBalanceLoading } = useUSDCBalance(
    studentData?.[2] ?? ""
  );
  const [swappedUSDCAmount, setSwappedUSDCAmount] = useState<number | null>(
    null
  );

  const fetchBasenameAddress = async (basename: string) => {
    try {
      const address = await resolveAddress({
        client,
        name: basename,
        resolverAddress: BASENAME_RESOLVER_ADDRESS,
        resolverChain: base,
      });
      if (address == "0x0000000000000000000000000000000000000000") {
        throw new Error("Invalid Basename");
      }
      return address;
    } catch (error) {
      console.error("Error fetching names:", error);
      throw new Error("Invalid Basename");
    }
  };

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        // Only fetch if the swapTransactionHash is available
        if (swapBundleId) {
          const { status, receipts } = await waitForSwapReceipt(
            swapBundleId as `0x${string}`,
            wallet!
          );
          setSwapReceipt(status);

          // Check if the receipt has a status, and if it's success
          if (status === "CONFIRMED") {
            setSwapStatus(
              `Swap Successful! You will receive ${
                swappedUSDCAmount ? swappedUSDCAmount.toFixed(2) : ""
              } USDC.`
            );
            setSwapTransactionHash(receipts[0].transactionHash);
            document.getElementById("swap-button")?.removeAttribute("disabled");
          }

          if (receipts[0].status === "reverted") {
            setSwapStatus("Swap failed.");
          }
        }

        // Only fetch if the sendUSDCTransactionHash is available
        if (sendBundleId) {
          const { status, receipts } = await waitForSendUSDCReceipt(
            sendBundleId as `0x${string}`,
            wallet!
          );
          setSendUSDCReceipt(status);

          // Check if the receipt has a status, and if it's success
          if (status === "CONFIRMED") {
            setSendStatus(`Sent ${amountToSend} USDC to ${recipientBasename}.`);
            setSendUSDCTransactionHash(receipts[0].transactionHash);
            //enable the send button
            document.getElementById("send-button")?.removeAttribute("disabled");
          }

          if (receipts[0].status === "reverted") {
            setSendStatus("Send failed.");
          }
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        // Provide a fallback error message
        if (swapTransactionHash) {
          setSwapStatus("Error fetching swap transaction receipt.");
        }
        if (sendUSDCTransactionHash) {
          setSendStatus("Error fetching send transaction receipt.");
        }
      }
    };

    fetchReceipt();
  }, [
    swapBundleId,
    sendBundleId,
    swappedUSDCAmount,
    amountToSend,
    recipientBasename,
  ]);

  useEffect(() => {
    if (
      !isContractLoading &&
      data !== undefined &&
      Object.keys(data).length > 0
    ) {
      setStudentData(data as string[]);
      setIsLoading(false);
    }

    if (!data || Object.keys(data).length === 0 || studentData === undefined) {
      setIsLoading(false);
    }
  }, [isContractLoading, data]);

  useEffect(() => {
    if (sendStatus) {
    }
  }, [sendStatus]);

  useEffect(() => {
    if (studentData?.[2]) {
      getTBABalance(studentData?.[2] ?? "").then(setTbaBalance);
    }

    if (
      usdcData ||
      swapStatus?.startsWith("Swap Successful!") ||
      sendStatus?.startsWith("Sent")
    ) {
      setUsdcBalance(usdcData);
    }
  }, [studentData, swapStatus, sendStatus, usdcData]);

  useEffect(() => {
    if (amountToSwap && !isNaN(parseFloat(amountToSwap))) {
      const usdcEquivalentAmount = parseFloat(amountToSwap) * ethToUsdRate;
      setUsdcEquivalent(usdcEquivalentAmount);
    } else {
      setUsdcEquivalent(0); // Reset if the input is invalid
    }
  }, [amountToSwap, ethToUsdRate]);

  const fetchEthToUsdRate = async () => {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );
      setEthToUsdRate(response.data.ethereum.usd);
    } catch (error: any) {
      const errorMessage =
        error instanceof AxiosError ? error.message : String(error);

      if (error.code === "ERR_NETWORK") {
        console.error("Network error. Temporarily disabling the USDC display.");
        //disable the usdc display for all elements with the id usdc-equivalent
        document.querySelectorAll("#usdc-equivalent").forEach((element) => {
          element.classList.add("hidden");
        });
      } else {
        console.error(`Swap failed with ${errorMessage}`);
      }
    }
  };

  useEffect(() => {
    fetchEthToUsdRate();
  }, []);

  useEffect(() => {
    if (swapStatus?.startsWith("Swap Successful!")) {
      //fetch the swapped usdc amount
      fetchUSDCSwapped(studentData?.[2] as string).then((amount) =>
        setSwappedUSDCAmount(amount)
      );
    }
  }, [swapStatus]);

  const handleSwapEthToUsdc = async () => {
    if (!amountToSwap || isNaN(parseFloat(amountToSwap))) {
      alert("Please enter a valid amount of ETH to swap.");
      return;
    }

    //disable the swap button
    document.getElementById("swap-button")?.setAttribute("disabled", "true");

    try {
      const amountToSwapBigInt = BigInt(parseFloat(amountToSwap) * 1e18); // Convert ETH to wei as bigint

      setSwapStatus("Swapping...");

      // Call the swapETHToUSDC hook
      const bundleId = await swapETHToUSDC(
        wallet!,
        studentData?.[2] as string,
        amountToSwapBigInt
      );

      console.log("bundleId", bundleId);

      setSwapBundleId(bundleId.bundleId);
    } catch (error) {
      console.error(error);

      // Extract error message if available
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const formattedError = errorMessage.split(" - ")[0];

      // Set the error message in the swapStatus state
      setSwapStatus(`Swap failed: ${formattedError}`);

      //enable the swap button
      document.getElementById("swap-button")?.removeAttribute("disabled");
    }
  };

  const handleSend = async () => {
    if (!amountToSend || isNaN(parseFloat(amountToSend))) {
      alert("Please enter a valid amount of USDC to send.");
      return;
    }

    if (!recipientBasename) {
      alert("Please enter a valid Basename or address to send USDC.");
      return;
    }

    try {
      // Set the "Resolving Basename..." message
      setSendStatus("Resolving Basename...");

      //disable the send button
      document.getElementById("send-button")?.setAttribute("disabled", "true");

      // Resolve Basename to address or use the provided address directly
      const address = recipientBasename.endsWith(".base.eth")
        ? await fetchBasenameAddress(recipientBasename)
        : recipientBasename;

      if (!address) {
        throw new Error("Invalid Basename or address.");
      }

      const recipientAddress = recipientBasename.endsWith(".base.eth")
        ? await fetchBasenameAddress(recipientBasename)
        : address;

      const amountToSendBigInt = BigInt(parseFloat(amountToSend) * 1e6); // Convert USDC to 6 decimals

      // Set the "Sending..." message
      setSendStatus("Sending...");

      // Call the sendUSDC hook and get the transaction hash
      const bundleId = await sendUSDC(
        wallet!,
        studentData?.[2] as string,
        recipientAddress as string,
        amountToSendBigInt
      );

      console.log("bundleId", bundleId);

      // Set the transaction hash and status
      setSendBundleId(bundleId.bundleId);
    } catch (error: any) {
      setSendStatus(`Send failed with ${error.message}`);

      //enable the send button
      document.getElementById("send-button")?.removeAttribute("disabled");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const ethBalanceValue = Number(tbaBalance) || 0;
  const usdBalance = ethBalanceValue * ethToUsdRate;
  const usdcBalanceValue = Number(usdcBalance) || 0;

  const items = [
    {
      title: "ETH & USDC balances in your NFT wallet",
      description: (
        <>
          <div>
            <span className="font-semibold">ETH: </span>
            {ethBalanceValue.toFixed(4)} ETH
          </div>
          <div id="usdc-equivalent">
            <span className="font-semibold">Equivalent in USD: </span>$
            {usdBalance.toFixed(2)}
          </div>
          <div className="mt-10">
            <span className="font-semibold">USDC: </span>
            {usdcBalanceValue.toFixed(4)} USDC
          </div>
        </>
      ),
      link: "#",
    },
    {
      title: "Swap ETH to USDC",
      description: (
        <>
          <input
            type="number"
            placeholder="Amount in ETH"
            value={amountToSwap}
            onChange={(e) => setAmountToSwap(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-neutral-800"
          />
          <p className="text-sm text-gray-400 mb-2" id="usdc-equivalent">
            USDC Equivalent:{" "}
            {usdcEquivalent > 0
              ? `${usdcEquivalent.toFixed(2)} USDC`
              : "0 USDC"}
          </p>
          {studentData?.[2] && (
            <button
              id="swap-button"
              onClick={handleSwapEthToUsdc}
              className="relative px-6 py-3 text-lg font-semibold rounded-md overflow-hidden group border-2 border-white mt-4"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-500 via-red-500 via-blue-500 via-cyan-500 via-violet-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
              <span className="relative z-10 text-neutral-800 dark:text-neutral-100 group-hover:text-white transition-colors duration-500">
                Swap
              </span>
            </button>
          )}
          {swapStatus && (
            <div className="text-sm mt-4 p-4 bg-gray-800 rounded-md">
              <p
                className={`mt-2 ${
                  swapStatus.startsWith("Swap Successful!")
                    ? "text-green-400"
                    : swapStatus.startsWith("Swapping")
                    ? "text-yellow-400"
                    : "text-red-400"
                } break-words`}
                style={{ wordBreak: "break-word" }}
              >
                {swapStatus}
              </p>
              {swapStatus.startsWith("Swap Successful!") && (
                <button
                  onClick={() =>
                    window.open(
                      `https://sepolia.basescan.org/tx/${swapTransactionHash}`,
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
        </>
      ),
      link: "#",
    },
    {
      title: "Send USDC",
      description: (
        <>
          <input
            type="text"
            placeholder="Recipient Basename or address"
            value={recipientBasename}
            onChange={(e) => setRecipientBasename(e.target.value)}
            className="w-full p-2 mb-2 rounded bg-neutral-800"
          />
          <input
            type="number"
            placeholder="Amount in USDC"
            value={amountToSend}
            onChange={(e) => setAmountToSend(e.target.value)}
            className="w-full p-2 mb-2 rounded bg-neutral-800"
          />
          {studentData?.[2] && (
            <button
              id="send-button"
              onClick={handleSend}
              className="relative px-6 py-3 text-lg font-semibold rounded-md overflow-hidden group border-2 border-white mt-4"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-500 via-red-500 via-blue-500 via-cyan-500 via-violet-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
              <span className="relative z-10 text-neutral-800 dark:text-neutral-100 group-hover:text-white transition-colors duration-500">
                Send
              </span>
            </button>
          )}
          {sendStatus && (
            <div className="text-sm mt-4 p-4 bg-gray-800 rounded-md">
              <p
                className={`mt-2 ${
                  sendStatus.startsWith("Sent")
                    ? "text-green-400"
                    : sendStatus.startsWith("Sending")
                    ? "text-yellow-400"
                    : sendStatus.startsWith("Resolving")
                    ? "text-blue-400"
                    : "text-red-400"
                } break-words`}
                style={{ wordBreak: "break-word" }}
              >
                {sendStatus}
              </p>
              {sendStatus.startsWith("Sent") && (
                <button
                  onClick={() =>
                    window.open(
                      `https://sepolia.basescan.org/tx/${sendUSDCTransactionHash}`,
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
        </>
      ),
      link: "#",
    },
  ];

  return <HoverEffect className="mb-20" items={items} />;
};

export default StudentTreasury;
