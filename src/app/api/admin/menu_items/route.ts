// api/admin/menu_items/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const filePath = path.resolve("src/Json/sidebar_menu.json");

export async function GET() {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(fileContent));
  } catch (error) {
    console.error("Error reading menu items:", error);
    return NextResponse.json({ error: "Failed to read menu items" }, { status: 500 });
  }
}