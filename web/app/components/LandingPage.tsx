"use client";

import React, { useEffect, useState, useRef } from "react";
import { BackgroundLines } from "../components/ui/background-lines";
import { useActiveAccount } from "thirdweb/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalTrigger,
} from "./ui/animated-modal";
import { IconScan, IconCards, IconTypeface } from "@tabler/icons-react";
import styles from "./LandingPage.module.css";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@lnx85/zxing-js";

declare global {
  interface Window {
    NDEFReader: any;
  }
}

// NFC Functionality
function readNFC() {
  if ("NDEFReader" in window) {
    try {
      const ndef = new window.NDEFReader();
      ndef
        .scan()
        .then(() => {
          console.log("Scan started successfully.");
          ndef.onreadingerror = () => {
            console.log("Cannot read data from the NFC tag. Try another one?");
          };
          ndef.onreading = (event: any) => {
            if (event.serialNumber) {
              alert(`CardUID: ${event.serialNumber}`);
              window.location.href = `/dashboard/${event.serialNumber}`;
            } else {
              console.error("Failed to read NFC");
            }
          };
        })
        .catch((error: any) => {
          console.log(`Error! Scan failed to start: ${error}.`);
        });
    } catch (error) {
      console.log(`Error! Scan failed to start: ${error}.`);
    }
  } else {
    console.warn("NFC not supported by this browser.");
  }
}

export function LandingPage() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const [os, setOS] = useState<string>("Unknown");
  const [hasNFCSupport, setHasNFCSupport] = useState<boolean>(false); // NFC support state
  const [isScanning, setIsScanning] = useState<boolean>(false); // Control camera scanning
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const detectedOS = getOS();
    setOS(detectedOS);
    checkNFCSupport(); // Check for NFC support
  }, []);

  const getOS = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) return "Windows";
    if (
      userAgent.includes("macintosh") &&
      !userAgent.includes("iphone") &&
      !userAgent.includes("ipad")
    )
      return "macOS";
    if (userAgent.includes("linux") && !userAgent.includes("android"))
      return "Linux";
    if (userAgent.includes("iphone") || userAgent.includes("ipad"))
      return "iOS";
    if (userAgent.includes("android")) return "Android";
    return "Unknown";
  };

  const checkNFCSupport = () => {
    if ("NDEFReader" in window) {
      setHasNFCSupport(true);
    } else {
      setHasNFCSupport(false);
    }
  };

  const handleBarcodeReading = async () => {
    setIsScanning(true);
    const codeReader = new BrowserMultiFormatReader();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();

        codeReader.decodeFromVideoDevice(
          null,
          videoRef.current,
          (result, err) => {
            if (result) {
              window.location.href = `/dashboard/${result.getText()}`;
              stopBarcodeReading();
            }
            if (err) {
              console.error(err);
            }
          }
        );
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopBarcodeReading = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsScanning(false);
    }
  };

  const handleTap = () => {
    if (hasNFCSupport) {
      alert("Tap your student card");
      readNFC();
    } else {
      console.warn("NFC not supported on this device.");
      alert("NFC is not supported on your device.");
    }
  };

  const handleScan = () => {
    handleBarcodeReading();
  };

  const handleType = () => {
    const cardUID = prompt("Enter your CardUID");
    if (cardUID) {
      router.push(`/dashboard/${cardUID}`);
    }
  };

  const verificationMethods = [
    {
      icon: <IconScan size={48} color="white" />,
      title: "Scan Student Card",
      description:
        "Use your device's camera to scan your student card barcode for verification.",
      action: handleScan,
      showOn: ["iOS"],
    },
    {
      icon: <IconCards size={48} color="white" />,
      title: "Tap Student Card",
      description:
        "Tap your NFC-enabled student card to your device for quick verification.",
      action: handleTap,
      showOn: hasNFCSupport ? ["Android"] : [], // Only show if NFC is supported
    },
    {
      icon: <IconTypeface size={48} color="white" />,
      title: "Type CardUID",
      description:
        "Type the CardUID from your student card for verification, this can be student ID too.",
      action: handleType,
      showOn: ["Windows", "macOS", "Linux", "Android", "iOS"],
    },
  ];

  const renderVerificationCards = () => {
    const filteredMethods = verificationMethods.filter((method) =>
      method.showOn.includes(os)
    );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mx-auto">
        {filteredMethods.map((method, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 flex flex-col items-center text-center shadow-lg cursor-pointer transition-all duration-300 ${styles.wobbleCard}`}
            onClick={method.action}
          >
            {method.icon}
            <h3 className="text-lg font-semibold mt-2 mb-1 text-white">
              {method.title}
            </h3>
            <p className="text-sm text-gray-300 mb-3">{method.description}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 min-h-screen relative z-10">
      <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-600 to-white text-5xl sm:text-6xl md:text-6xl lg:text-8xl font-sans py-4 sm:py-6 md:py-8 relative z-20 font-bold tracking-tight">
        BasedAuth
      </h2>
      <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-neutral-700 dark:text-neutral-400 text-center px-4">
        Linking NFT wallets to student cards with biometrics and social login.
      </p>
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-center mb-4">
              Scanning for Barcode...
            </h3>
            {/* Video stream for barcode scanning */}
            <video ref={videoRef} className="viewport w-full h-auto" />
            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md w-full"
              onClick={stopBarcodeReading}
            >
              Stop Scanning
            </button>
          </div>
        </div>
      )}
      {!isScanning && activeAccount?.address && (
        <Modal>
          <ModalTrigger className="bg-black dark:bg-white dark:text-black text-white flex justify-center group/modal-btn mt-5 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base">
            <span className="group-hover/modal-btn:translate-x-40 text-center transition duration-500">
              Access NFT Wallet
            </span>
            <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-white z-20">
              <IconScan size={24} color="black" />
            </div>
          </ModalTrigger>
          <ModalBody>
            <ModalContent className="px-4 w-full max-w-3xl mx-auto">
              <h4 className="text-xl sm:text-2xl font-bold text-center mb-4 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
                Access Your NFT Wallet
              </h4>
              <p className="text-xs sm:text-sm text-center text-gray-300 mb-4">
                <span className="font-semibold text-indigo-400">BasedAuth</span>{" "}
                adapts to your device:
                <span className="italic ml-1">Options tailored for {os}</span>
              </p>
              <p className="text-xs sm:text-sm text-center text-gray-300 mb-5">
                Your{" "}
                <span className="underline decoration-dotted">
                  student card&apos;s cardUID
                </span>{" "}
                is the key to your
                <span className="font-bold text-emerald-400 ml-1">
                  NFT wallet
                </span>
              </p>
              <div className="flex flex-col items-center space-y-4 mb-4">
                {renderVerificationCards()}
              </div>
              <p className="text-xs text-gray-400 text-center italic mt-2">
                Detected: <span className="font-medium">{os}</span>
              </p>
            </ModalContent>
          </ModalBody>
        </Modal>
      )}
    </BackgroundLines>
  );
}
