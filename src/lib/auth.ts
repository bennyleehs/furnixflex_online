// lib/auth.ts

import bcrypt from "bcryptjs";
import { createPool } from "./db";
import { AuthToken } from "@/types/auth";
import { SignJWT, jwtVerify } from "jose";
import { getPermissionsForRole } from "@/utils/accessControlUtils";

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
      return { expired: true };
    }

    console.error("❌ Invalid or expired token:", err);
    return null;
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
    branchRef, 
    departmentName, 
    roleName,
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
