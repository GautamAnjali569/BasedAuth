"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { client } from "../client";
import { ConnectButton } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { CoinbaseWallet } from "@thirdweb-dev/wallets";
import { useRouter } from "next/navigation";

const wallets = [
  createWallet("com.coinbase.wallet", {
    walletConfig: {
      options: "smartWalletOnly",
    },
  }),
];

const Navbar = () => {
  const router = useRouter();
  return (
    <div className="m-5 flex relative justify-between z-10 bg-none">
      <h2 className="mt-3 bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-600 to-white text-2xl md:text-2xl lg:text-2xl font-sans relative z-20 font-bold tracking-tight">
        <button onClick={() => router.push("/")}>BasedAuth</button>
      </h2>
      <ConnectButton
        client={client}
        wallets={wallets}
        appMetadata={{
          name: "BasedAuth",
          url: "https://basedauth.luca3.io",
          logoUrl: "/Luca3.png",
        }}
        autoConnect={true}
        chains={[baseSepolia]}
        connectButton={{
          label: "Get BASED",
        }}
        connectModal={{
          title: "Get BASED with BasedAuth",
          showThirdwebBranding: false,
        }}
        showAllWallets={false}
      />
    </div>
  );
};

export default Navbar;
