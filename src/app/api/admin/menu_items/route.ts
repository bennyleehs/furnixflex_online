// api/admin/menu_items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMenuFilePath } from "@/Sidemenu/loader";
import { promises as fs } from "fs";

export async function GET(req: NextRequest) {
  try {
    const country = req.headers.get("x-country") || "my";
    const filePath = getMenuFilePath(country);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (error) {
    console.error("Error reading menu items:", error);
    return NextResponse.json({ error: "Failed to read menu items" }, { status: 500 });
  }
}