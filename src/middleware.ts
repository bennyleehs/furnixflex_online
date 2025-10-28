// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes (accessible without auth)
const publicPaths = [
  "/auth/signin",
  "/auth/signup",
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/refresh", // <--- CRITICAL: Refresh API must be publicly accessible by the middleware
];

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|images|favicon.ico).*)"],
  // matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

// Helper to decode base64url (kept from original file)
function base64UrlDecode(str: string): Uint8Array {
  const base64 =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "==".slice((str.length + 3) % 4);
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// JWT verification (Edge-compatible)
async function verifyJwt(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    new Uint8Array(signature),
    new Uint8Array(data),
  );

  if (!isValid) return false;

  // Expiration check
  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
  );
  if (payload.exp && payload.exp < Date.now() / 1000) return false;

  return true;
}

// --- HELPER FUNCTION FOR SILENT REFRESH ---
async function attemptSilentRefresh(
  request: NextRequest,
): Promise<NextResponse | null> {
  const refreshUrl = new URL("/api/auth/refresh", request.url);

  // 1. Internal Fetch: Call the refresh API, forwarding existing cookies (which include the refreshToken)
  const internalResponse = await fetch(refreshUrl.toString(), {
    method: "POST",
    headers: {
      Cookie: request.headers.get("Cookie") || "", // Forward ALL cookies
    },
  });

  if (internalResponse.ok) {
    // 2. Refresh SUCCESSFUL: The refresh API has set new cookies on its response.
    // It must return a redirect to force the browser to accept the new cookies
    // and re-request the protected page with the fresh authToken.
    const redirectResponse = NextResponse.redirect(request.url);

    // 3. Propagate Cookies: Get new cookies from the internal response and set them on the redirect response
    internalResponse.headers.getSetCookie().forEach((cookie) => {
      redirectResponse.headers.append("Set-Cookie", cookie);
    });

    return redirectResponse;
  }

  // 4. Refresh FAILED
  return null;
}
// --- END HELPER FUNCTION ---

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If the path contains a file extension (e.g., .jpg), it's a static file.
  if (/\./.test(pathname)) {
    return NextResponse.next();
  }

  // Skip public paths
  if (publicPaths.includes(pathname)) return NextResponse.next();

  // Check JWT
  const token = request.cookies.get("authToken")?.value;

  // 1. If token is present AND valid, allow access.
  if (token && (await verifyJwt(token))) {
    return NextResponse.next();
  }

  // 2. Token is missing or invalid/expired: Attempt silent refresh
  const refreshResponse = await attemptSilentRefresh(request);

  if (refreshResponse) {
    // Refresh successful, return the redirect response with new cookies
    return refreshResponse;
  } else {
    // 3. Refresh failed (Auth Token was missing, OR Refresh Token was expired/invalid).
    // Force sign-in.
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);

    // Create the redirect response and clear all auth cookies
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.delete("authToken");
    redirectResponse.cookies.delete("refreshToken"); // Ensure a clean logout

    return redirectResponse;
  }
}
