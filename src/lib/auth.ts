// lib/auth.ts

import bcrypt from "bcryptjs";
import { createPool } from "./db";
import { AuthToken } from "@/types/auth";
import { SignJWT, jwtVerify } from "jose";
import { getPermissionsForRole } from "@/utils/accessControlUtils";
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

export interface AuthToken {
  userId: number;
  role: number;
  department: number;
  branch: number;
  iat?: number;
  exp?: number;
}

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const {
      id,
      roleName,
      departmentName,
      branchRef,
      permissions,
      iat,
      exp,
    } = payload as {
      id?: number;
      roleName?: string;
      departmentName?: string;
      branchRef?: string;
      permissions?: string[];
      iat?: number;
      exp?: number;
    };

    if (
      typeof id !== "number" ||
      typeof roleName !== "string" ||
      typeof departmentName !== "string" ||
      typeof branchRef !== "string" ||
      !Array.isArray(permissions) ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      console.error("❌ Invalid token structure:", payload);
      return null;
    }

    return {
      id,
      roleName,
      departmentName,
      branchRef,
      permissions,
      iat,
      exp,
    };
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      console.warn("⚠️ Token expired, but structurally valid.");
// Function to encode text to base64url
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Function to decode base64url to text
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

// Function to verify token using Web Crypto API
export async function verifyToken(token: string): Promise<AuthToken | { expired: true }> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    
    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { expired: true };
    }

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(process.env.JWT_SECRET || "your-secret-key"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(Array.from(signature).map(c => c.charCodeAt(0))),
      data
    );

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    return payload as AuthToken;
  } catch (error) {
    console.error("Token verification error:", error);
    return { expired: true };
  }
}

//function generate token with permissions
export async function generateToken(
  userId: number,
  roleName: string,
  departmentName: string,
  branchRef: string,
) {
  if (!secretKey) throw new Error("JWT secret key is missing");

  // Get permissions based on branch, department, and role
  const permissions = getPermissionsForRole(
    branchRef, // Branch code (e.g., 'JB', 'SK')
    departmentName, // Department name (e.g., 'Technology')
    roleName, // Role title (e.g., 'Supervisor')
  );

  const now = Math.floor(Date.now() / 1000); // iat

  return new SignJWT({
    id: userId,
    roleName,
    departmentName,
    branchRef,
    permissions, // Include permissions array in the token
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(secretKey);
}
// Function to generate token using Web Crypto API

// Database query for user's token details
export async function getUserDetailsFromDatabase(
  userId: number,
): Promise<{ role: number; department: number; branch: number } | null> {
  const query = "SELECT role_id, department_id, branch_id FROM users1 WHERE id = ?";
  const [rows] = await db.query<RowDataPacket[]>(query, [userId]);

  if (rows.length > 0) {
    return rows[0] as { role: number; department: number; branch: number };
  }

  return null;
}
