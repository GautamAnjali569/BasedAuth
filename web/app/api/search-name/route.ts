import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const name = searchParams.get("name");

  if (!domain || !name) {
    return NextResponse.json(
      { error: "Domain and name are required" },
      { status: 400 }
    );
  }

  const apiKey = "8f18b950-3b9e-4e04-848a-fad5c66ef5a4";
  const url = `https://namestone.xyz/api/public_v1/search-names?domain=${domain}&name=${name}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: apiKey,
      },
    });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error searching names:", error);
    return NextResponse.json(
      { error: "Failed to search names" },
      { status: 500 }
    );
  }
}
