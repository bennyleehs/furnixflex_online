// src/lib/authMiddleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";
import { AuthToken, VerifiedToken } from "@/types/auth"; //  For guard function & refresh token
import { getPermissionsForRole } from "@/utils/accessControlUtils";

export interface AuthenticatedRequest extends NextRequest {
  user: AuthToken & { permissions: string[] };
}

// Define the Type Guard function
function isAuthToken(token: VerifiedToken): token is AuthToken {
  return !!token && typeof (token as AuthToken).roleName === "string";
}

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  requiredPermissions: string[],
) {
  return async (req: NextRequest) => {
    // Return the async function directly
    // Extract authToken from cookies
    const authToken = req.cookies.get("authToken")?.value;

    // console.log(authToken);
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Decode token to get user info
      const decoded = await verifyToken(authToken);
      if (!decoded || "expired" in decoded) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }

      if (!isAuthToken(decoded)) {
        // If it's a RefreshToken or any other invalid type, reject access.
        return NextResponse.json(
          {
            hasPermission: false,
            error: "Invalid token type for permission check",
          },
          { status: 401 },
        );
      }

      // console.log(decoded);
      // Ensure the decoded token's permissions include at least one required permission
      // const userPermissions: string[] = decoded.permissions || [];
      const userPermissions: string[] = getPermissionsForRole(
        decoded.branchRef,
        decoded.departmentName,
        decoded.roleName,
      );
      // Check if any required permission exists in the user's permissions array
      const hasPermission = requiredPermissions.some((p) =>
        userPermissions.includes(p),
      );
      if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Add user info to request
      const authenticatedReq = req as AuthenticatedRequest;
      // authenticatedReq.user = decoded;
      authenticatedReq.user = {
        ...decoded, // Spread the existing decoded properties (id, roleName, etc.)
        permissions: userPermissions, // Add the dynamically fetched permissions
      };

      // Call the handler with the authenticated request
      return handler(authenticatedReq);
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }
  };
}
