import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // Set ALLOW_SIGNUPS=false to close registration (existing users can still sign in).
  if (process.env.ALLOW_SIGNUPS === "false") {
    return NextResponse.json({ error: "New sign-ups are closed right now" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  // bcrypt only uses the first 72 bytes of a password.
  if (Buffer.byteLength(password) > 72) {
    return NextResponse.json({ error: "Password must be 72 characters or fewer" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
