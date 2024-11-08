"use client";

import React, { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { usePathname } from "next/navigation";
import { MediaRenderer } from "thirdweb/react";
import { client } from "../client";
import { getStudentData } from "../../hooks/getStudentData";
import {
  claimCertification,
  waitForClaimReceipt,
} from "../../hooks/claimCertification";
import { getCertifications } from "../../hooks/fetchCertificationIdByUID";
import { getCertificationsMetadata } from "../../hooks/getCertificationMetadata";
import { InfiniteMovingCards } from "./ui/infinite-moving-cards";

const StudentCertification: React.FC = () => {
  const account = useActiveAccount();
  const slug = usePathname();
  const cardUID = slug?.split("/")[2];

  const [studentData, setStudentData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [certificationIds, setCertificationIds] = useState<bigint[]>([]);
  const [certificationId, setCertificationId] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [claimBundleId, setClaimBundleId] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [certificationItems, setCertificationItems] = useState<any[]>([]); // State to store the certification items

  const { studentData: data, isLoading: isContractLoading } =
    getStudentData(cardUID);

  // Fetch certifications only once and process them
  useEffect(() => {
    if (cardUID) {
      const fetchCertifications = async () => {
        try {
          const ids = await getCertifications(cardUID); // Get certification IDs
          const metadata = await getCertificationsMetadata(ids); // Fetch metadata for all certs

          // Process certifications for InfiniteMovingCards
          const processedForMovingCards = metadata.certificationMetadata.map(
            (cert: any) => {
              const certData = JSON.parse(cert.certificationData); // Parse cert data
              return {
                name: certData.name,
                image: certData.image, // Just the name and image (IPFS hash)
              };
            }
          );

          console.log("processedForMovingCards", processedForMovingCards);

          // Set both states
          setCertificationItems(processedForMovingCards); // Store processed certs for existing logic
          setIsLoading(false); // Stop loading once done
        } catch (error) {
          console.error("Error fetching certifications:", error);
          setIsLoading(false); // Stop loading in case of error
        }
      };

      fetchCertifications();
    }
  }, [cardUID, claimStatus, claimBundleId]);

  useEffect(() => {
    if (
      !isContractLoading &&
      data !== undefined &&
      Object.keys(data).length > 0
    ) {
      setStudentData(data);
      setIsLoading(false);
    }
  }, [isContractLoading, data]);

  // Claim certification
  const handleClaim = async () => {
    if (!certificationId) {
      alert("Please enter a valid certification ID.");
      return;
    }

    try {
      setClaimStatus("Claiming...");

      //disable the claim button
      document.getElementById("claim-button")?.setAttribute("disabled", "true");

      console.log("studentData", studentData?.[2]);

      const { bundleId } = await claimCertification(
        studentData?.[2] as string,
        BigInt(certificationId)
      );

      setClaimBundleId(bundleId as string);

      const { status } = await waitForClaimReceipt(bundleId as string);

      if (status?.status === "CONFIRMED") {
        setClaimStatus(
          `Successfully claimed certification ${certificationId}.`
        );
        setClaimTxHash(status?.receipts[0].transactionHash as string);

        //enable the claim button
        document.getElementById("claim-button")?.removeAttribute("disabled");
      } else {
        setClaimStatus("Claim failed.");
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("0x7ba5ffb5")) {
        setClaimStatus(
          "Invalid Signer detected. Please connect to the correct wallet."
        );
      } else {
        const formattedError = errorMessage.split(" - ")[0];
        setClaimStatus(`Claim failed with ${formattedError}`);
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mb-20">
      {/* Conditionally render InfiniteMovingCards if there are certifications */}
      {certificationItems.length > 0 && (
        <div className="bg-neutral-900 rounded-lg p-4 mb-10">
          <h2 className="text-s font-bold mb-2">Your Certifications</h2>

          {/* Pass the fetched certs to InfiniteMovingCards */}
          <InfiniteMovingCards
            items={certificationItems}
            direction="left"
            speed="fast"
            className="w-100 h-100"
          />
        </div>
      )}

      {studentData?.[2] ? (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Claim New Certification</h2>

          {/* Container for input, button, and status */}
          <div className="flex flex-col items-start space-y-4">
            <input
              type="text"
              placeholder="Certification ID"
              value={certificationId || ""}
              onChange={(e) => setCertificationId(e.target.value)}
              className="w-full p-2 rounded bg-neutral-800 border-2 border-white"
            />
            <button
              id="claim-button"
              onClick={handleClaim}
              className="w-full px-6 py-1 text-xl font-semibold rounded-md overflow-hidden group border-2 border-white whitespace-nowrap relative"
            >
              <span className="relative z-10 text-neutral-100 group-hover:text-white transition-colors duration-500">
                Claim
              </span>
            </button>

            {/* Status Box */}
            {claimStatus && (
              <div className="text-sm px-4 py-2 bg-gray-800 rounded-md w-full max-w-md">
                <p
                  className={`${
                    claimStatus.startsWith("Successfully claimed")
                      ? "text-green-400"
                      : claimStatus === "Claiming..."
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {claimStatus}
                </p>
                {claimStatus.startsWith("Successfully claimed") &&
                  claimTxHash && (
                    <button
                      onClick={() =>
                        window.open(
                          `https://sepolia.basescan.org/tx/${claimTxHash}`,
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
        </div>
      ) : (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">No TBA Found</h2>
          <p>Please create an NFT wallet to claim certifications.</p>
        </div>
      )}
    </div>
  );
};

export default StudentCertification;
