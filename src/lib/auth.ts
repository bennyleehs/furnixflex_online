import bcrypt from "bcryptjs";
import { AuthToken } from "@/types/auth";
import { SignJWT, jwtVerify } from "jose";

//secret key
const secretKey = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

//function verifyPassword
export async function verifyPassword1(
  password: string,
  hashedPassword: string,
) {
  return bcrypt.compare(password, hashedPassword);
}

// function to handle $2y$ and $2b$ hash formats
function normalizeHash(hash: string): string {
  // Check if hash - $2y$ format, and convert to $2b$ for bcrypt compatibility
  if (hash.startsWith("$2y$")) {
    return hash.replace("$2y$", "$2b$");
  }
  return hash;
}

// Function to verify the password with its stored hash
export async function verifyPassword(
  inputPassword: string,
  storedHash: string,
): Promise<boolean> {
  const normalizedHash = normalizeHash(storedHash);
  return bcrypt.compare(inputPassword, normalizedHash);
}

// function verify token
export async function verifyToken(
  token: string,
): Promise<AuthToken | null | { expired: true }> {
  try {
    if (!secretKey) {
      console.error("❌ JWT secret key is missing");
      return null;
    }

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    console.log(
      "🔍 Raw Decoded Payload:",
      process.env.NODE_ENV === "development" ? payload : "Hidden",
    ); // Log only in dev mode

    // Extract required fields and validate them
    // retrieve from AuthToken interface
    const { id, iat, exp } = payload as {
      id?: number;
      iat?: number;
      exp?: number;
    };

    if (
      typeof id !== "number" ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      console.error("❌ Invalid token structure:", payload);
      return null;
    }

    // Token is valid
    return { id, iat, exp };
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      console.warn("⚠️ Token expired, but structurally valid.");
      return { expired: true }; // Middleware can use this to trigger refresh
    }

    console.error("❌ Invalid or expired token:", err);
    return null;
  }
}

//function generate token v0.0.2
export async function generateToken(userId: number) {
  if (!secretKey) throw new Error("JWT secret key is missing");

  const now = Math.floor(Date.now() / 1000); // Get current timestamp

  return new SignJWT({ id: userId, iat: now }) // Explicitly include `iat`
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1days") //expiring time
    .sign(secretKey);
}
