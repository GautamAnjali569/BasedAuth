import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import Navbar from "./components/Navbar";
import FontLoader from "./components/FontLoader";
import AutoScrollWrapper from "./components/useAutoScrollOnFocus";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "BasedAuth",
  description:
    "BasedAuth is the BASED way to perform any blockchain transactions with an NFC Card",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FontLoader />
        <ThirdwebProvider>
          <Navbar></Navbar>
          <AutoScrollWrapper>{children}</AutoScrollWrapper>
        </ThirdwebProvider>
      </body>
    </html>
  );
}
