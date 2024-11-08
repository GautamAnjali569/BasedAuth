"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Card from "./Card";
import {
  MediaRenderer,
  useActiveAccount,
  useActiveWallet,
  useWalletBalance,
} from "thirdweb/react";
import { baseSepolia, base } from "thirdweb/chains";
import { useSwitchActiveWalletChain } from "thirdweb/react";
import { upload } from "thirdweb/storage";
import { client } from "../client";
import { getStudentData } from "../../hooks/getStudentData";
import {
  registerStudent,
  waitForRegStudentReceipt,
} from "../../hooks/registerStudent";
import { CardContainer, CardBody, CardItem } from "./ui/3d-card";
import { getTBABalance } from "../../hooks/getTBABalance";
import { getTBACreationTx } from "../../hooks/getTBACreationTx";
import {
  registerBasename,
  waitForRegisterBasenameReceipt,
} from "../../hooks/registerBasename";
import Link from "next/link";
import { MultiStepLoader } from "./ui/multi-step-loader";
import {
  Address,
  keccak256,
  encodePacked,
  namehash,
  createPublicClient,
  http,
} from "viem";
import { baseSepolia as baseSepoliaViem } from "viem/chains";
import {
  resolveL2Name,
  resolveAddress,
  BASENAME_RESOLVER_ADDRESS,
} from "thirdweb/extensions/ens";
import { parseEther, formatEther } from "ethers/lib/utils";

const StudentProfile: React.FC = () => {
  const router = useRouter();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const slug = usePathname();
  const cardUID = slug?.split("/")[2];
  const { data: walletBalance } = useWalletBalance({
    client,
    address: account?.address,
    chain: base,
  });

  const [studentData, setStudentData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<bigint | null>(null);
  const [basename, setBasename] = useState<string | null>(null);
  const [basenameDomain, setBasenameDomain] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [balance, setBalance] = useState<string | number | null>(null);
  const [txBundleId, setTxBundleId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(90);
  const [isRegisteringBasename, setIsRegisteringBasename] = useState(false);
  const [registeredBasename, setRegisteredBasename] = useState(false);
  const [profileRegistered, setProfileRegistered] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const switchChain = useSwitchActiveWalletChain();

  type Basename = `${string}.basetest.eth`;

  const calculateRequiredBalance = (baseName: string) => {
    const nameLength = baseName.length;
    let fee = "0";
    if (nameLength == 3) {
      fee = "0.1";
    } else if (nameLength == 4) {
      fee = "0.01";
    } else if (nameLength >= 5 && nameLength <= 9) {
      fee = "0.001";
    } else if (nameLength >= 10) {
      fee = "0.0001";
    }
    return fee;
  };

  const convertChainIdToCoinType = (chainId: number): string => {
    const cointype = (0x80000000 | chainId) >>> 0;
    return cointype.toString(16).toLocaleUpperCase();
  };

  async function fetchName(address: Address) {
    const name = await resolveL2Name({
      client,
      address: address,
      resolverAddress: BASENAME_RESOLVER_ADDRESS,
      resolverChain: base,
    });
    setBasename(name?.split(".")[0] ?? "");
    setBasenameDomain(name?.split(".")[1] + "." + name?.split(".")[2]);
    console.log("name", name);

    const resolvedAddress = await resolveAddress({
      client,
      name: basename + "." + basenameDomain,
      resolverAddress: BASENAME_RESOLVER_ADDRESS,
      resolverChain: base,
    });
    setResolvedAddress(resolvedAddress);
  }

  const handleBasenameRegister = async () => {
    if (!studentData?.[2] || !studentData?.[0]) {
      alert("Cannot register basename. No TBA Address or basename found.");
      return;
    }

    setIsRegisteringBasename(true);
    //disable the claim button
    document
      .getElementById("basename-button")
      ?.setAttribute("disabled", "true");

    try {
      const studentIdString =
        studentData?.[0].toString().length === 5
          ? `0${studentData?.[0]}`
          : `${studentData?.[0]}`;

      const defaultBaseName = `${studentIdString}.base.eth`;

      // Prompt user for custom basename with default value
      const customBaseName = prompt(
        "Enter custom basename (or leave as is for default):",
        defaultBaseName
      );

      if (customBaseName === null) {
        // User canceled the prompt
        setIsRegisteringBasename(false);
        return;
      }

      if (customBaseName.trim() === "") {
        // User entered an empty string
        setIsRegisteringBasename(false);
        return;
      }

      //Make sure that the basename ends with .base.eth
      if (!customBaseName.endsWith(".base.eth")) {
        alert("Base name must end with .base.eth");
        setIsRegisteringBasename(false);
        return;
      }

      const requiredBalance = calculateRequiredBalance(
        customBaseName.split(".")[0]
      );

      const requiredBalanceWei = parseEther(requiredBalance);
      const walletBalanceWei = BigInt(walletBalance?.value.toString() ?? "0");

      if (
        BigInt(walletBalanceWei.toString()) <
        BigInt(requiredBalanceWei.toString())
      ) {
        alert(
          `Insufficient balance. Required: ${formatEther(
            requiredBalanceWei
          )} ETH. Available: ${formatEther(walletBalanceWei)} ETH`
        );
        setIsRegisteringBasename(false);
        return;
      }

      //switch wallet to base
      switchChain(base);

      const bundleId = await registerBasename(
        wallet!,
        customBaseName ?? defaultBaseName,
        studentData?.[2],
        parseFloat(requiredBalance)
      );

      const status = await waitForRegisterBasenameReceipt(
        bundleId.bundleId,
        wallet!
      );

      if (status?.status.status === "CONFIRMED") {
        setRegisteredBasename(true);
        alert("Basename registered successfully!");
        switchChain(baseSepolia);
      }
    } catch (error: any) {
      console.log(error);
      alert("Error registering basename: " + error.message);
      switchChain(baseSepolia);
    } finally {
      setIsRegisteringBasename(false);
      switchChain(baseSepolia);

      //enable the claim button
      document.getElementById("basename-button")?.removeAttribute("disabled");
    }
  };

  const { studentData: data, isLoading: isContractLoading } =
    getStudentData(cardUID);

  useEffect(() => {
    if (
      !isContractLoading &&
      data !== undefined &&
      Object.keys(data).length > 0
    ) {
      setStudentData(data);
      setIsLoading(false);
    }

    if (profileRegistered) {
      setStudentData(data);
      setIsLoading(false);
    }

    if (!data || Object.keys(data).length === 0 || studentData === undefined) {
      setIsLoading(false);
    }
  }, [isContractLoading, data, profileRegistered]);

  useEffect(() => {
    if (studentData && studentData?.[2]) {
      console.log("Fetching basename for user", account?.address);
      fetchName(account?.address as Address);
    }

    if (registeredBasename) {
      fetchName(account?.address as Address);
    }
  }, [studentData, basename, basenameDomain, registeredBasename, data]);

  useEffect(() => {
    if (studentData?.[2]) {
      getTBABalance(studentData[2]).then(setBalance);
    }
  }, [studentData]);

  useEffect(() => {
    if (studentData?.[2]) {
      const fetchTxHash = async () => {
        try {
          const event = await getTBACreationTx(studentData?.[2]);
          if (event) {
            setTxHash(event?.transactionHash);
          }
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching transaction hash:", error);
        }
      };

      fetchTxHash();
    }
  }, [studentData]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
    }
  };

  const handleStudentIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    try {
      if (value.length >= 5) {
        if (/^[0-9]{5,6}$/.test(value)) {
          setStudentId(BigInt(value));
        } else {
          alert("Please enter a valid Student ID (5 to 6 digits).");
          event.target.value = value.slice(0, 6); // Trim to 6 digits if exceeding
          setStudentId(BigInt(event.target.value));
        }
      } else {
        setStudentId(null);
      }
    } catch (error) {}
  };

  const handleSubmit = () => {
    if (!studentId || !imageFile) {
      alert("Please enter your Student ID and upload an image.");
      return;
    }

    setIsRegistering(true);
    setRegistrationStep(0);
    switchChain(baseSepolia);

    try {
      // Step 1: Upload image file to IPFS
      upload({ client, files: [imageFile] })
        .then((uri) => {
          setRegistrationStep(1);
          return registerStudent(
            wallet!,
            cardUID,
            studentId,
            uri?.split("/")[2] + "/" + uri?.split("/")[3]
          );
        })
        .then((bundleId) => {
          setRegistrationStep(2);
          setTxBundleId(bundleId.bundleId);
          setRegistrationStep(3);
        })
        .then(async () => {
          let result;
          if (txBundleId && wallet) {
            result = await waitForRegStudentReceipt(txBundleId, wallet);
          }
          if (result?.status.status === "CONFIRMED") {
            setProfileRegistered(true);
          }
          setRegistrationStep(4);
          return new Promise<void>((resolve) => {
            setCountdown(90);
            const intervalId = setInterval(() => {
              setCountdown((prev) => {
                if (prev === 1) {
                  clearInterval(intervalId);
                  resolve();
                }
                return prev - 1;
              });
            }, 1000);
          });
        })
        .then(() => {
          setRegistrationStep(5);
        })
        .then(() => {
          setRegistrationStep(6);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error during registration process:", error);
          setIsRegistering(false);
          alert("Request failed with error: " + error);
        })
        .finally(() => {
          setIsRegistering(false);
        });
    } catch (error) {
      console.error("Error registering student:", error);
      alert("Request failed with error: " + error);
      setIsRegistering(false);
    }
  };

  const loadingStates = [
    { text: "Picture uploaded to IPFS" },
    { text: "Student Registration Requested to BasedAuth Smart Contract" },
    { text: "Transaction Processing" },
    { text: "Transaction Done" },
    {
      text:
        countdown > 0
          ? `Waiting for API3 to reply (Time remaining: ${countdown}s)`
          : "Waiting for API3 to reply",
    },
    { text: "Student NFT Wallet Registered" },
  ];

  const renderStudentFound = () => (
    <div className="mb-20 flex flex-col items-center justify-center space-y-6 md:space-y-0 md:flex-row md:space-x-12 p-6 w-full md:max-w-6xl mx-auto">
      <div className="flex flex-col items-center space-y-6 w-full md:w-1/2">
        {/* Card Container */}
        <CardContainer className="card-container w-full max-w-xs md:max-w-sm lg:max-w-md">
          <CardBody className="bg-gray-900 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] rounded-xl p-6 border transition-all duration-300 ease-out hover:scale-[1.02] flex flex-col items-center">
            <CardItem
              translateZ="50"
              className="w-full h-[200px] md:h-[300px] rounded-lg overflow-hidden mb-6"
            >
              <MediaRenderer
                client={client}
                src={`ipfs://${studentData?.[1]}`}
                alt="Student Profile Picture"
                width="100%"
                height="100%"
                className="object-cover"
              />
            </CardItem>
            <CardItem
              as="span"
              translateZ="60"
              className="text-white text-lg md:text-xl font-semibold text-center block"
            >
              {basename ? (
                <button
                  className="text-blue-400"
                  onClick={() =>
                    window.open(
                      `https://basescan.org/address/${resolvedAddress}#nfttransfers`,
                      "_blank"
                    )
                  }
                >{`${basename}.${basenameDomain}`}</button>
              ) : (
                <button
                  id="basename-button"
                  onClick={handleBasenameRegister}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-300 focus:outline-none"
                >
                  {isRegisteringBasename ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white inline-block mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                  ) : (
                    "Register Basename"
                  )}
                </button>
              )}
            </CardItem>
            <CardItem
              as="p"
              translateZ="60"
              className="text-neutral-300 text-sm md:text-base mt-4"
            >
              Balance: {balance ?? "Loading..."} ETH
            </CardItem>
            <CardItem
              translateZ={20}
              as={Link}
              href={txHash ? `https://sepolia.basescan.org/tx/${txHash}` : "#"}
              target="_blank"
              className="mt-6 text-blue-400 hover:underline text-sm"
            >
              Initial Registration Transaction →
            </CardItem>
          </CardBody>
        </CardContainer>
      </div>

      {/* Profile Information */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/2 lg:max-w-md">
        <h2 className="text-2xl font-bold text-white border-b border-gray-600 pb-2 mb-4 text-center md:text-left">
          Student Profile
        </h2>
        <div className="space-y-3">
          <ProfileItem
            label="NFT Wallet Address"
            value={
              studentData?.[2] ? (
                <a
                  href={`https://sepolia.basescan.org/address/${studentData[2]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {studentData[2]}
                </a>
              ) : (
                "Loading..."
              )
            }
          />
          <ProfileItem
            label="Student ID"
            value={
              studentData?.[0]
                ? studentData[0].toString().length === 5
                  ? `0${studentData[0]}`
                  : `${studentData[0]}`
                : ""
            }
          />
          <ProfileItem label="Card UID" value={cardUID} />
        </div>
      </div>
    </div>
  );

  const renderStudentNotFound = () => (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-4xl mx-auto flex flex-col md:flex-row mt-4 space-y-6 md:space-y-0">
      <div className="flex-1 md:mr-6">
        <h2 className="text-2xl font-bold mb-4 text-white">
          Explore more with your student card!
        </h2>
        <p className="mb-4 text-gray-300">Card UID: {cardUID}</p>
        <div className="mb-4">
          <label
            htmlFor="studentId"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Student ID (numbers only, 0 is ignored)
          </label>
          <input
            type="text"
            id="studentId"
            value={studentId?.toString()}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your student ID"
            onChange={handleStudentIdChange}
          />
        </div>
        <div className="mb-6">
          <label
            htmlFor="profilePicture"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Upload Profile Picture
          </label>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="profilePicture"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors duration-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
              <input
                type="file"
                id="profilePicture"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Create Student NFT Wallet
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Profile Preview"
            className="max-w-full h-auto max-h-64 rounded-lg shadow-md"
          />
        ) : (
          <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
            Image Preview
          </div>
        )}
      </div>
    </div>
  );

  const ProfileItem = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white font-medium truncate">{value}</p>
    </div>
  );

  return (
    <div className="space-y-4 p-4 mb-10">
      {isLoading ? (
        <Card>
          <p>Loading data...</p>
        </Card>
      ) : studentData && Object.keys(studentData).length > 0 ? (
        renderStudentFound()
      ) : (
        renderStudentNotFound()
      )}
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={isRegistering}
        currentState={registrationStep}
      />
    </div>
  );
};

export default StudentProfile;
