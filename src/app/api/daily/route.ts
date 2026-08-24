import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getDailySummary } from "@/lib/streak";

export async function GET() {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getDailySummary(user.id));
}
