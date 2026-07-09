import { NextRequest, NextResponse } from "next/server";
import {
  createMemberOrganisation,
  listMemberOrganisations,
  validateOrganisationInput,
} from "@/lib/member-organisations-db";

export async function GET() {
  try {
    return NextResponse.json(await listMemberOrganisations());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load organisations." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as unknown;
  const validated = validateOrganisationInput(body);

  if (typeof validated === "string") {
    return NextResponse.json({ message: validated }, { status: 400 });
  }

  try {
    return NextResponse.json(await createMemberOrganisation(validated), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create organisation." },
      { status: 500 },
    );
  }
}
