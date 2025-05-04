// lib/auth.ts

import bcrypt from "bcryptjs";
import { createPool } from "./db";
import jwt from 'jsonwebtoken';
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

// function verify token
export async function verifyToken(token: string): Promise<AuthToken | { expired: true }> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AuthToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { expired: true };
    }
    throw error;
  }
}

//function generate token v0.0.2
export async function generateToken(
  userId: number,
  role: number,
  department: number,
  branch: number
): Promise<string> {
  return jwt.sign(
    { userId, role, department, branch },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
}

//db query for user's token {id, role, department, branch}
export async function getUserDetailsFromDatabase(
  userId: number,
): Promise<{ role: number; department: number; branch: number } | null> {
  const query =
    "SELECT role_id, department_id, branch_id FROM users1 WHERE id = ?";
    // "SELECT role_id, department_id, branch_id FROM users1 WHERE id = ?";
  const [rows] = await db.query<RowDataPacket[]>(query, [userId]);

  if (rows.length > 0) {
    return rows[0] as { role: number; department: number; branch: number };
  }

  return null;
}
