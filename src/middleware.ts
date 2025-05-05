import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs"; // Ensure it runs in Node.js

export async function middleware(req: NextRequest) {
  console.log("✅ Middleware triggered for:", req.nextUrl.pathname);

  const { pathname } = req.nextUrl;
  //   Allow access to authentication routes and static assets
  if (
    pathname.startsWith("/auth1/signin") || // Allow access to signin page
    pathname.startsWith("/api/auth") || // Allow API auth routes if needed
    pathname.startsWith("/_next") || // Allow Next.js static files
    pathname.startsWith("/images") || //Allow public asset (images)
    pathname.startsWith("/favicon.ico") // Allow favicon
  ) {
    console.log("🔓 Skipping middleware for:", pathname);
    return NextResponse.next();
  }

  /// production (dev)
  // const token = req.cookies.get("authToken")?.value;

  /// deploy (start)
  const cookieHeader = req.headers.get("cookie") || "";
  console.log("📌 Raw Cookie Header:", cookieHeader); // Debugging

  /// ✅ Use Next.js cookies API to retrieve the token
  const token = (await cookies()).get("authToken")?.value;
  console.log("🔍 Next.js Cookie API Token:", token || "No token found");

  if (!token) {
    /// update ver
    console.log("⛔ No token. Waiting before redirect...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay
    return NextResponse.redirect(new URL("/auth1/signin", req.url));
  }

  const decodedToken = await verifyToken(token); // ✅ Ensure token is awaited
  console.log("🔑 Decoded token:", decodedToken);

  if (!decodedToken) {
    console.log("⛔ Invalid token. Redirecting to /auth1/signin.");
    return NextResponse.redirect(new URL("/auth1/signin", req.url));
  }

  if (!decodedToken || ("expired" in decodedToken && decodedToken.expired)) {
    console.warn("⏳ Token expired. Redirecting to signin.");
    return NextResponse.redirect(new URL("/auth1/signin", req.url));
  }

  console.log("✅ Authentication passed. Granting access.", decodedToken);
  return NextResponse.next();
}

//  Apply middleware to all routes except explicitly allowed ones
export const config = {
  matcher: "/((?!auth1/signin|_next|api/auth|images|favicon.ico).*)",
  // runtime: "edge", /// production (dev)
  runtime: "nodejs", /// deploy (start)
  // unstable_allowDynamic: ["**/node_modules/lodash/**/*.js"],
};
