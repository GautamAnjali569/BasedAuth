import React from "react";
import { TextHoverEffect } from "./ui/text-hover-effect";

export function FancyBackground() {
  return (
    <div className="h-[15rem] md:h-[20rem] lg:h-[30rem] flex items-center justify-center text-xl mt-10">
      <TextHoverEffect text="BasedAuth" />
    </div>
  );
}
