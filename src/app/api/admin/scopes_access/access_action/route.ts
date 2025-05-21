// api/admin/scopes_access/access_action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const filePath = path.resolve("src/data/access_action.json");

export async function GET() {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (err) {
    console.error("Error reading access action file:", err);
    return NextResponse.json({ error: "Failed to read access action file" }, { status: 500 });
  }
}