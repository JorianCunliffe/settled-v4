import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const result = await login(body.email, body.password);
    return NextResponse.json({
      message: "Login successful!",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error logging in" },
      { status: 401 },
    );
  }
}
