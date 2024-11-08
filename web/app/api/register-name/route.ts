import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  const { name, userWalletAddress } = await request.json();
  const apiKey = "8f18b950-3b9e-4e04-848a-fad5c66ef5a4";
  const url = "https://namestone.xyz/api/public_v1/claim-name";

  const data = {
    domain: "luca3.eth",
    name: name,
    address: userWalletAddress,
    text_records: {
      "com.twitter": "luca3",
      "com.github": "luca3",
      "com.discord": "luca3",
      url: "https://auth.luca3.io/",
      location: "🇺🇲",
      description: "BasedAuth is awesome!",
    },
  };

  const config = {
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios.post(url, data, config);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error claiming name:", error);
    return NextResponse.json(
      { error: "Failed to claim name" },
      { status: 500 }
    );
  }
}
