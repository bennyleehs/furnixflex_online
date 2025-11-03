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
  // const refreshUrl = new URL("/api/auth/refresh", request.url); // <-- OLD

  // --- START OF FIX ---
  // Force the fetch to use the internal http://localhost:PORT
  // instead of the public https://domain.com
  // Assumes your 'npm start' command runs on port 3000.
  const port = process.env.PORT || 3000;
  const refreshUrl = new URL(`http://localhost:${port}/api/auth/refresh`);
  // --- END OF FIX ---

  // 1. Get the cookies. We only need the refreshToken for the API call to succeed.
  const refreshToken = request.cookies.get("refreshToken")?.value;

  // If the refreshToken isn't even present, don't make the API call.
  if (!refreshToken) {
    return null;
  }

  // --- START OF FIX ---
  // 1. Create a new Headers object from the original request.
  // This copies 'Host', 'x-forwarded-host', etc., which are
  // needed for the production environment to route the internal fetch.
  const requestHeaders = new Headers(request.headers);

  // 2. Overwrite the 'Cookie' header to send *only* the refreshToken.
  // We don't want to send the old, expired authToken.
  requestHeaders.set("Cookie", `refreshToken=${refreshToken}`);
  // --- END OF FIX ---

  // --- ADD TRY/CATCH BLOCK AROUND THE FETCH ---
  try {
    // 1. Internal Fetch: Call the refresh API
    const internalResponse = await fetch(refreshUrl.toString(), {
      method: "POST",
      // headers: {
      //   Cookie: `refreshToken=${refreshToken}`,
      // },
      headers: requestHeaders, // <-- NEW: Use the copied headers
    });

    if (internalResponse.ok) {
      // 2. Refresh SUCCESSFUL
      const redirectResponse = NextResponse.redirect(request.url);

      // 3. Propagate Cookies
      internalResponse.headers.getSetCookie().forEach((cookie) => {
        redirectResponse.headers.append("Set-Cookie", cookie);
      });

      return redirectResponse;
    }

    // 4. Refresh FAILED (API returned 401, etc.)
    return null;
  } catch (error) {
    // 5. CATCH FETCH ERROR (API crashed, network error)
    console.error("Middleware refresh fetch failed:", error);
    // Prevent 500 error by returning null, which triggers redirect to signin
    return null;
  }
  // --- END OF TRY/CATCH BLOCK ---
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
    // Check if the refresh token exists (even if invalid/expired)
    if (request.cookies.has("refreshToken")) {
      // ✅ Must explicitly clear stale cookies on the redirect response
      redirectResponse.cookies.set("authToken", "", {
        maxAge: 0,
        httpOnly: true,
        path: "/",
      });
      redirectResponse.cookies.set("refreshToken", "", {
        maxAge: 0,
        httpOnly: true,
        path: "/",
      });
    }

    return redirectResponse;
  }
}
