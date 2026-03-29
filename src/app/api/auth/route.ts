import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "admin";
const COOKIE_NAME = "app_tracker_auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === AUTH_PASSWORD) {
    const token = Buffer.from(`authenticated:${Date.now()}`).toString("base64");
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
