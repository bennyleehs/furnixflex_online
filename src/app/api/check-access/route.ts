// app/api/check-access/route.ts
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { checkUserAccess } from "@/utils/accessControlUtils";

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");
    
    if (!authToken?.value) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }
    
    // Verify the token
    const tokenData = await verifyToken(authToken.value);
    
    if (!tokenData || "expired" in tokenData) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }
    
    // Use permissions from token to check access
    const hasAccess = checkUserAccess(tokenData.permissions || [], path);
    
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error("Error checking access:", error);
    return NextResponse.json({ hasAccess: false }, { status: 500 });
  }
}