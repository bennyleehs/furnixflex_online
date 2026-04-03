// lib/auth.ts
import bcrypt from "bcryptjs";
import { getPool } from "./db";
import { AuthToken, UserClaims, RefreshToken } from "@/types/auth";
import { SignJWT, jwtVerify } from "jose";
// import { getPermissionsForRole } from "@/utils/accessControlUtils";

// const db = await getPool();

const secretKey = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

// --- PLACEHOLDER: MUST implement this function to fetch user details from DB ---
// The refresh token only holds the 'uid'. To generate a new AuthToken, we need the
// user's up-to-date role, department, and branchRef.
export async function fetchUserClaimsByUid(
  uid: string,
): Promise<UserClaims | null> {
  const db = await getPool();
  try {
    const [rows] = await db.query(
      "SELECT uid, name, roleName, deptName as departmentName, branchRef FROM users WHERE uid = ?",
      [uid],
    );

    const user = (rows as any[])[0];

    if (!user) return null;

    // Assuming UserClaims matches this structure
    return {
      uid: user.uid,
      roleName: user.roleName,
      departmentName: user.departmentName,
      branchRef: user.branchRef,
    };
  } catch (error) {
    // Catch database errors specifically to prevent a 500 crash
    console.error("Database error during user claims fetch:", error);
    return null; // Token refresh will fail and lead to 401/redirect
  }
}

// Function to verify the password
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// function verify token
export async function verifyToken(
  token: string,
): Promise<AuthToken | RefreshToken | null | { expired: true }> {
  try {
    if (!secretKey) {
      console.error("❌ JWT secret key is missing");
      return null;
    }

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      typ: "JWT",
    });

    const {
      uid,
      // id,
      roleName,
      departmentName,
      branchRef,
      // permissions,
      iat,
      exp,
      type, // <--- NEW: Check token type for refresh token
    } = payload as {
      uid?: string;
      // id?: number;
      roleName?: string;
      departmentName?: string;
      branchRef?: string;
      // permissions?: string[];
      iat?: number;
      exp?: number;
      type?: "auth" | "refresh"; // <--- NEW TYPE HINT
    };

    // --- Check for Refresh Token structure ---
    if (type === "refresh") {
      if (typeof uid !== "string" || typeof exp !== "number") {
        console.error("❌ Invalid refresh token structure:", payload);
        return null;
      }
      // Return minimal RefreshToken structure
      return { uid, exp, type: "refresh" } as RefreshToken;
    }

    // --- Check for Auth Token structure ---
    if (
      typeof uid !== "string" ||
      // typeof id !== "number" ||
      typeof roleName !== "string" ||
      typeof departmentName !== "string" ||
      typeof branchRef !== "string" ||
      // !Array.isArray(permissions) ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      console.error("❌ Invalid token structure:", payload);
      return null;
    }

    return {
      uid,
      // id,
      roleName,
      departmentName,
      branchRef,
      // permissions,
      iat,
      exp,
    };
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      console.warn("⚠️ Token expired, but structurally valid.");
      return { expired: true };
    }

    if (err.code === "ERR_JWT_TYPE_INVALID") {
      console.error("❌ Invalid token type (typ header missing or invalid).");
      return null;
    }

    console.error("❌ Invalid or expired token:", err);
    return null;
  }
}

//function generate token with permissions
export async function generateAuthToken( // <--- RENAMED from generateToken
  uid: string,
  // userId: number,
  roleName: string,
  departmentName: string,
  branchRef: string,
) {
  if (!secretKey) throw new Error("JWT secret key is missing");

  // Get permissions based on branch, department, and role
  // const permissions = getPermissionsForRole(
  //   branchRef,
  //   departmentName,
  //   roleName,
  // );

  const now = Math.floor(Date.now() / 1000); // iat

  return (
    new SignJWT({
      uid,
      // id: userId,
      roleName,
      departmentName,
      branchRef,
      type: "auth", // <--- NEW: Clearly mark as Auth Token
      // permissions, // Include permissions array in the token
      iat: now,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      // .setExpirationTime("1d")
      // .setExpirationTime("1h") // <--- SHORT-LIVED: 1 hour
      // .setExpirationTime("20s") // <--- 20 sec testing
      .setExpirationTime("9h") // <--- 9 hour
      .sign(secretKey)
  );
}

// Function to generate a LONG-LIVED Refresh Token
export async function generateRefreshToken(uid: string) {
  if (!secretKey) throw new Error("JWT secret key is missing");

  const now = Math.floor(Date.now() / 1000); // iat

  return new SignJWT({
    uid,
    type: "refresh", // <--- NEW: Clearly mark as Refresh Token
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("7d") // <--- LONG-LIVED: 7 days
    .sign(secretKey);
}
