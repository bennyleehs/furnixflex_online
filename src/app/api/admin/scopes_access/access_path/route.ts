// api/admin/scopes_access/access_path/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessControlFilePath } from "@/Sidemenu/loader";
import { promises as fs } from "fs";

export async function GET(req: NextRequest) {
  try {
    const country = req.headers.get("x-country") || "my";
    const filePath = getAccessControlFilePath(country);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (err) {
    console.error("Error reading access control file:", err);
    return NextResponse.json({ error: "Failed to read access control file" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const country = req.headers.get("x-country") || "my";
    const filePath = getAccessControlFilePath(country);
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