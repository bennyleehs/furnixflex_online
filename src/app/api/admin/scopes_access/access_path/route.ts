// api/admin/scopes_access/access_path/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { withAuth, AuthenticatedRequest } from "@/lib/authMiddleware";

const filePath = path.resolve("src/data/access_control.json");

// async function handler(req: AuthenticatedRequest) {
async function handler() {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (err) {
    console.error("Error reading access control file:", err);
    return NextResponse.json({ error: "Failed to read access control file" }, { status: 500 });
  }
}

async function handlePut(req: AuthenticatedRequest) {
  try {
    const { key, accessPath } = await req.json();
    
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    
    // Read existing data
    const fileContent = await fs.readFile(filePath, "utf-8");
    const accessControlData = JSON.parse(fileContent);
    
    // Find the original key with correct casing
    const originalKey = Object.keys(accessControlData).find(
      k => k.toUpperCase() === key.toUpperCase()
    );
    
    if (!originalKey) {
      return NextResponse.json({ error: `Key "${key}" not found in access control data` }, { status: 404 });
    }
    
    // Update specific entry (preserving original key casing)
    accessControlData[originalKey] = accessPath;
    
    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(accessControlData, null, 2));
    
    return NextResponse.json({ success: true, key: originalKey, accessPath });
  } catch (err) {
    console.error("Error updating access path:", err);
    return NextResponse.json({ error: "Failed to update access path" }, { status: 500 });
  }
}

// Export the route handlers with authentication and required permissions
// Export the route handler with authentication middleware
export const GET = withAuth(handler, [
  "1.0.1",
  "1.0.2",
  "1.6.1",
  "1.6.2",
]);
export const PUT = withAuth(handlePut, ["1.0.1","1.0.2", "1.6.1", "1.6.2"]);