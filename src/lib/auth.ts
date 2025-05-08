// lib/auth.ts

import bcrypt from "bcryptjs";
import { createPool } from "./db";
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

// Function to generate token using Web Crypto API
export async function generateToken(
  userId: number,
  role: number,
  department: number,
  branch: number
): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload = {
    userId,
    role,
    department,
    branch,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.JWT_SECRET || "your-secret-key"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

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
