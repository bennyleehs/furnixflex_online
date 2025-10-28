// app/api/check-access/route.ts
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  checkUserAccess,
  getPermissionsForRole,
} from "@/utils/accessControlUtils";
import { AuthToken, VerifiedToken } from "@/types/auth"; //  For guard function & refresh token

// 1. Define the Type Guard function
// Checks if the token is an AuthToken by checking for a property unique to it (e.g., roleName).
function isAuthToken(token: VerifiedToken): token is AuthToken {
  return !!token && typeof (token as AuthToken).roleName === "string";
}

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

    // 2. Apply the Type Guard to ensure we have an AuthToken
    if (!isAuthToken(tokenData)) {
      // If a RefreshToken somehow made it here, reject access.
      return NextResponse.json(
        { hasAccess: false, error: "Invalid token type for access check" },
        { status: 401 },
      );
    }

    const userPermissions = getPermissionsForRole(
      tokenData.branchRef,
      tokenData.departmentName,
      tokenData.roleName,
    );

    // Use permissions from token to check access
    // const hasAccess = checkUserAccess(tokenData.permissions || [], path);
    // Use the fetched permissions to check access
    const hasAccess = checkUserAccess(userPermissions, path);

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error("Error checking access:", error);
    return NextResponse.json({ hasAccess: false }, { status: 500 });
  }
}
