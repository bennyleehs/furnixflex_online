// api/admin/scopes_access/access_action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessActionFilePath } from "@/Sidemenu/loader";
import { promises as fs } from "fs";

export async function GET(req: NextRequest) {
  try {
    const country = req.headers.get("x-country") || "my";
    const filePath = getAccessActionFilePath(country);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (err) {
    console.error("Error reading access action file:", err);
    return NextResponse.json({ error: "Failed to read access action file" }, { status: 500 });
  }
}