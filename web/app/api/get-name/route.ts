import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const apiKey = "8f18b950-3b9e-4e04-848a-fad5c66ef5a4";
  const url = `https://namestone.xyz/api/public_v1/get-names?address=${address}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: apiKey,
      },
    });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching names:", error);
    return NextResponse.json(
      { error: "Failed to fetch names" },
      { status: 500 }
    );
  }
}
