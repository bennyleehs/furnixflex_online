import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthToken } from "./auth";
import { checkAccess } from "@/utils/accessControl";

export interface AuthenticatedRequest extends NextRequest {
  user: AuthToken;
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  path: string
) {
  return async (req: NextRequest) => {
    // Extract authToken from cookies
    const authToken = req.cookies.get("authToken")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Decode token to get user info
      const decoded = await verifyToken(authToken);
      if ('expired' in decoded) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }

      // Check if user has permission to access this endpoint
      const hasAccess = await checkAccess(decoded.userId, path);
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Add user info to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = decoded;

      // Call the handler with the authenticated request
      return handler(authenticatedReq);
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
  };
} 