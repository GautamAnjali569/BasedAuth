"use client";
import React from "react";
import Link from "next/link";
import { HoverBorderGradient } from "../components/ui/hover-border-gradient";

export function StartButton() {
  return (
    <div className="m-5 flex justify-center text-center">
      <Link href="/dashboard">
        <HoverBorderGradient
          containerClassName="rounded-full"
          as="button"
          className="bg-black text-white flex items-center space-x-2"
        >
          <span>Explore Now</span>
        </HoverBorderGradient>
      </Link>
    </div>
  );
}
