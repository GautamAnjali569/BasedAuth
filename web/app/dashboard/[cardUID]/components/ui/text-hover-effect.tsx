"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export const TextHoverEffect = ({
  text,
  duration,
}: {
  text: string;
  duration?: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });
  const [isMobile, setIsMobile] = useState(false);
  const maskAnimation = useAnimation();

  // Check if the device is mobile
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobile(/mobile|android|ios|iphone|ipad/.test(userAgent));
  }, []);

  // Track the cursor position if it's not mobile
  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null && !isMobile) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor, isMobile]);

  // Start breathing animation for mobile devices
  useEffect(() => {
    if (isMobile) {
      maskAnimation.start({
        r: ["1%", "30%", "1%"], // More pronounced breathing effect
        transition: {
          duration: 2.5, // Slower and more noticeable
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        },
      });
    }
  }, [isMobile, maskAnimation]);

  // Reset mask position and stop animation on mouse leave
  const handleMouseLeave = () => {
    setHovered(false);
    // Reset mask to the center and stop the mask animation
    maskAnimation.stop(); // Stop any ongoing animation
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => {
        setHovered(true);
        maskAnimation.start({
          r: ["1%", "30%", "1%"], // More pronounced breathing effect
          transition: {
            duration: 2.5, // Slower and more noticeable
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          },
        }); // Start animation on hover
      }}
      onMouseLeave={handleMouseLeave} // Stop animation on mouse leave
      onMouseMove={(e) =>
        !isMobile && setCursor({ x: e.clientX, y: e.clientY })
      }
      className="select-none"
    >
      <defs>
        {/* Define a more vibrant gradient */}
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ff9a9e" />
          <stop offset="25%" stopColor="#fad0c4" />
          <stop offset="50%" stopColor="#fbc2eb" />
          <stop offset="75%" stopColor="#a18cd1" />
          <stop offset="100%" stopColor="#fbc2eb" />
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r={isMobile ? "10%" : "20%"} // Adjust mask size for mobile with breathing effect
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="textMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#revealMask)"
          />
        </mask>
      </defs>

      {/* Outline Text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="font-[helvetica] font-bold stroke-neutral-200 dark:stroke-neutral-800 fill-transparent text-7xl"
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>

      {/* Stroke animation for initial reveal */}
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="font-[helvetica] font-bold fill-transparent text-7xl stroke-neutral-200 dark:stroke-neutral-800"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>

      {/* Gradient Reveal Text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#textGradient)"
        strokeWidth="0.3"
        mask="url(#textMask)"
        className="font-[helvetica] font-bold fill-transparent text-7xl"
      >
        {text}
      </text>

      {/* Apply breathing effect to the gradient on mobile */}
      {isMobile && (
        <motion.text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          stroke="url(#textGradient)"
          strokeWidth="0.3"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="font-[helvetica] font-bold text-7xl"
        >
          {text}
        </motion.text>
      )}
    </svg>
  );
};
