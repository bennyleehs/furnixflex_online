// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes (accessible without auth)
const publicPaths = [
  "/auth/signin",
  "/auth/signup",
  "/api/auth/signin",
  "/api/auth/signup",
];

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|images|favicon.ico).*)"],
  // matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

// Helper to decode base64url
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

// JWT verification (Edge-compatible, type-safe)
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // // --- NEW CODE START ---
  // // Check if the path is a static file (e.g., has a file extension)
  // const isStaticFile = pathname.includes(".");
  // if (isStaticFile) {
  //   return NextResponse.next();
  // }
  // // --- NEW CODE END ---
  // --- IMPORTANT NEW CODE ---
  // If the path contains a file extension (e.g., .jpg), it's a static file.
  // We must return early to prevent the authentication check from running.
  if (/\./.test(pathname)) {
    return NextResponse.next();
  }
  // --- END OF NEW CODE ---

  // Skip public paths
  if (publicPaths.includes(pathname)) return NextResponse.next();

  // Check JWT
  const token = request.cookies.get("authToken")?.value;
  if (!token || !(await verifyJwt(token))) {
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
