import { NextRequest, NextResponse } from "next/server";
import {
  findUserById,
  getBearerToken,
  updateProfile,
  verifyAuthToken,
} from "@/lib/auth";

function getUserId(request: NextRequest) {
  return verifyAuthToken(getBearerToken(request.headers.get("authorization")));
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(userId);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    about?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
  const user = await updateProfile(userId, {
    about: body.about,
    firstName: body.firstName,
    lastName: body.lastName,
    phoneNumber: body.phoneNumber,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Profile updated successfully", user });
}
