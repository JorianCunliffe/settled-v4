import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
    termsAccepted?: boolean;
  };

  if (!body.email || !body.name || !body.password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  try {
    const user = await signup({
      email: body.email,
      name: body.name,
      password: body.password,
      termsAccepted: Boolean(body.termsAccepted),
    });

    return NextResponse.json(
      { message: "User created successfully!", user },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error creating user" },
      { status: 400 },
    );
  }
}
