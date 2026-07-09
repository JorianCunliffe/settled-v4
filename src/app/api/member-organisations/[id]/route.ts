import { NextRequest, NextResponse } from "next/server";
import {
  deleteMemberOrganisation,
  updateMemberOrganisation,
  validateOrganisationInput,
} from "@/lib/member-organisations-db";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as unknown;
  const validated = validateOrganisationInput(body);

  if (typeof validated === "string") {
    return NextResponse.json({ message: validated }, { status: 400 });
  }

  try {
    const payload = await updateMemberOrganisation(params.id, validated);

    if (!payload) {
      return NextResponse.json({ message: "Organisation not found." }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update organisation." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await deleteMemberOrganisation(params.id);

    if (!payload) {
      return NextResponse.json({ message: "Organisation not found." }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete organisation." },
      { status: 500 },
    );
  }
}
