import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth"; // Your server-side auth utility
import { getPermissionsForRole } from "@/utils/accessControlUtils"; // Your utility to read access_control.json
import { AuthToken, VerifiedToken } from "@/types/auth"; //  For guard function & refresh token

// Define Type Guard function to check if the token is an AuthToken
function isAuthToken(token: VerifiedToken): token is AuthToken {
  // An AuthToken has roleName, while a RefreshToken (in our current setup) only has 'uid' and 'type'.
  // Check for the AuthToken's unique properties.
  return !!token && typeof (token as AuthToken).roleName === "string";
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const authToken = (await cookieStore).get("authToken")?.value;

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await verifyToken(authToken);

    // 1. Check if token is invalid or expired
    if (!decodedToken || "expired" in decodedToken) {
      // Note: Since this is an API route, return 401.
      // The middleware will handle the silent refresh/redirect.
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    // 2. Check if the token is the correct type (AuthToken) using the Type Guard
    if (!isAuthToken(decodedToken)) {
      // This happens if somehow a refresh token was sent instead of an auth token.
      return NextResponse.json(
        { error: "Invalid token type for this endpoint" },
        { status: 401 },
      );
    }

    // TypeScript now knows decodedToken is definitely an AuthToken
    const { branchRef, departmentName, roleName } = decodedToken;

    // Fetch permissions using your server-side utility
    const permissions = getPermissionsForRole(
      branchRef,
      departmentName,
      roleName,
    );

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
