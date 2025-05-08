// // middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define paths that don't require authentication
const publicPaths = [
  "/auth/signin",
  "/auth/signup",
  "/api/auth/signin",
  "/api/auth/signup",
];

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("authToken")?.value;

  if (!token) {
    // Redirect to login if no token
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verify token using Web Crypto API
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    
    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error("Token expired");
    }

    // Continue if token is valid
    return NextResponse.next();
  } catch (error) {
    // Redirect to login if token is invalid
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
}
