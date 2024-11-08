"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { MediaRenderer } from "thirdweb/react"; // Import MediaRenderer to render the image
import { client } from "@/app/client";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    name: string;
    image: string; // IPFS hash passed from StudentCertification
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);
  const [duplicatedItems, setDuplicatedItems] = useState<any[]>([]);

  useEffect(() => {
    // Duplicate items for infinite scrolling
    setDuplicatedItems([...items, ...items]);
    setStart(true); // Start the animation
  }, [items]);

  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards"
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse"
        );
      }
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "10s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "10s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "15s");
      }
    }
  };

  useEffect(() => {
    getDirection();
    getSpeed();
  }, [direction, speed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        className={cn(
          "flex min-w-full shrink-0 gap-4 py-4 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {duplicatedItems.map((item, idx) => (
          <li
            key={idx}
            className="w-[350px] max-w-full relative rounded-2xl border border-b-0 flex-shrink-0 border-slate-700 px-8 py-6 md:w-[450px]"
            style={{
              background:
                "linear-gradient(180deg, var(--slate-800), var(--slate-900)",
            }}
          >
            <blockquote>
              <span className="relative z-20 text-sm leading-[1.6] text-gray-100 font-normal">
                {item.name}
              </span>
              <div className="relative z-20 mt-6 flex flex-row items-center">
                <MediaRenderer
                  client={client} // Render MediaRenderer for the IPFS image
                  src={`ipfs://${item.image}`} // IPFS hash
                  alt="Certification"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
};
