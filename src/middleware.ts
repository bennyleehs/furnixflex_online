// // middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith("/auth/signin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const token = (await cookies()).get("authToken")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  const decoded = await verifyToken(token);

  if (!decoded || "expired" in decoded) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // If user is authenticated, allow access to home page
  if (pathname === "/") {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!auth/signin|_next|api|images|favicon.ico).*)",
};
