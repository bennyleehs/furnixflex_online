import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const runtime = "nodejs"; // This route will run on Node.js runtime

export async function POST(req: NextRequest) {
  try {
    const { password, hashedPassword } = await req.json();

    // Normalize hash format if needed
    const normalizedHash = hashedPassword.startsWith("$2y$")
      ? hashedPassword.replace("$2y$", "$2b$")
      : hashedPassword;

    const isValid = await bcrypt.compare(password, normalizedHash);

    return NextResponse.json({ isValid });
  } catch (error) {
    console.error("Password verification error:", error);
    return NextResponse.json(
      { error: "Password verification failed" },
      { status: 500 }
    );
  }
} 