import bcrypt from "bcrypt";
import { getPool } from "@/lib/db";
import { Pool } from "mysql2/promise";
import { IUser } from "@/interface/app_interface";

// Utility function to handle $2y$ and $2b$ hash formats
function normalizeHash(hash: string): string {
  // Check if hash is in $2y$ format, and convert it to $2b$ for bcrypt compatibility
  if (hash.startsWith("$2y$")) {
    return hash.replace("$2y$", "$2b$");
  }
  return hash;
}

// Function to get the user by UID
async function getUserByUID(db: Pool, uid: string): Promise<IUser | null> {
  const [rows] = await db.query("SELECT * FROM users WHERE uid = ?", [uid]);
  return (rows as IUser[])[0] || null;
}

// Function to verify the password with its stored hash
async function verifyPassword(
  inputPassword: string,
  storedHash: string,
): Promise<boolean> {
  const normalizedHash = normalizeHash(storedHash);
  return bcrypt.compare(inputPassword, normalizedHash);
}

// // Function to update user password hash if needed
// async function updatePasswordHash(db: any, userId: number, password: string): Promise<void> {
//   const newHash = await bcrypt.hash(password, 10);
//   await db.query("UPDATE users SET password = ? WHERE id = ?", [newHash, userId]);
// }

export async function POST(req: Request) {
  const db = await getPool();

  try {
    const { uid, password } = await req.json();

    // Validate input
    if (!uid || !password) {
      return new Response(
        JSON.stringify({ error: "UID and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Fetch user by UID
    const user = await getUserByUID(db, uid);
    if (!user || !(await verifyPassword(password, user.password))) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // // Optionally re-hash user password if it's in $2y$ format
    // if (user.password.startsWith("$2y$")) {
    //   await updatePasswordHash(db, user.id, password); // Update password hash to $2b$
    // }

    // Respond with the token and user information
    return new Response(
      JSON.stringify({ user: { id: user.id, email: user.email } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error during sign-in:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  // finally {
  //   await db.end(); // Ensure the database connection is closed
  // }
}
