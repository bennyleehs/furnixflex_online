// lib/auth.ts

import bcrypt from "bcryptjs";
import { createPool } from "./db";
import { AuthToken } from "@/types/auth";
import { SignJWT, jwtVerify } from "jose";
import { RowDataPacket } from "mysql2/promise";

const db = createPool();

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

// function to handle $2y$ and $2b$ hash formats [$2y$ format, convert to $2b$ for bcrypt compatibility]
function normalizeHash(hash: string): string {
  // Check if hash - 
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

    const { id, role, department, branch, iat, exp } = payload as {
      id?: number;
      role?: number;
      department?: number;
      branch?: number;
      iat?: number;
      exp?: number;
    };

    if (
      typeof id !== "number" ||
      typeof role !== "number" ||
      typeof department !== "number" ||
      typeof branch !== "number" ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      console.error("❌ Invalid token structure:", payload);
      return null;
    }

    return { id, role, department, branch, iat, exp };
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      console.warn("⚠️ Token expired, but structurally valid.");
      return { expired: true };
    }

    console.error("❌ Invalid or expired token:", err);
    return null;
  }
}

//function generate token v0.0.2
export async function generateToken(
  userId: number,
  role: number,
  department: number,
  branch: number,
) {
  if (!secretKey) throw new Error("JWT secret key is missing");

  const now = Math.floor(Date.now() / 1000); // iat

  return new SignJWT({ id: userId, role, department, branch, iat: now })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d") // "1days" is invalid, use "1d"
    .sign(secretKey);
}

//db query for user's token {id, role, department, branch}
export async function getUserDetailsFromDatabase(
  userId: number,
): Promise<{ role: number; department: number; branch: number } | null> {
  const query =
    "SELECT role_id, department_id, branch_id FROM users1 WHERE id = ?";
  const [rows] = await db.query<RowDataPacket[]>(query, [userId]);

  if (rows.length > 0) {
    return rows[0] as { role: number; department: number; branch: number };
  }

  return null;
}
