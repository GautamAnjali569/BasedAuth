"use client";
import React, { useEffect } from "react";
import { Preview } from "./components/Preview";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { FancyBackground } from "./components/Background";

export default function Dashboard({ params }: { params: { cardUID: string } }) {
  const router = useRouter();
  const account = useActiveAccount();

  useEffect(() => {
    if (!account) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 10000); // 10s delay

      return () => clearTimeout(timer);
    }
  }, [account, router]);

  return (
    <div className="relative w-full h-screen overflow-y-auto">
      <div className="absolute inset-0 z-0 -top-28">
        <FancyBackground />
      </div>
      <div className="relative z-10 top-28 md:top-56">
        <Preview cardUID={params.cardUID} />
      </div>
    </div>
  );
}
