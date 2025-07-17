// app/api/check-section-type/route.ts
import { NextRequest, NextResponse } from "next/server";
import sidebarData from "@/Json/sidebar_menu.json";
import { DEFAULT_ACCESS_SECTIONS } from "@/utils/defaultAccess";

// Extract all menu items with their IDs and section names
function extractMenuItems(items: any[]): { id: string, sectionName: string }[] {
  let result: { id: string, sectionName: string }[] = [];
  
  for (const item of items) {
    if (item.id) {
      result.push({ id: item.id, sectionName: item.label });
    }
    
    if (item.children && Array.isArray(item.children)) {
      result = [...result, ...extractMenuItems(item.children)];
    }
  }
  
  return result;
}

// Get all menu items with their IDs and section names
const allMenuItems: { id: string, sectionName: string }[] = [];
sidebarData.forEach((section: { menuItems: any[]; }) => {
  if (section.menuItems && Array.isArray(section.menuItems)) {
    allMenuItems.push(...extractMenuItems(section.menuItems));
  }
});

export async function POST(req: NextRequest) {
  try {
    const { permissionValue } = await req.json();
    
    // Find the menu item with this permission value
    const menuItem = allMenuItems.find(item => item.id === permissionValue);
    
    if (!menuItem) {
      return NextResponse.json({ 
        sectionName: null,
        isDefaultSection: false 
      });
    }
    
    const isDefaultSection = DEFAULT_ACCESS_SECTIONS.includes(menuItem.sectionName);
    
    return NextResponse.json({
      sectionName: menuItem.sectionName,
      isDefaultSection
    });
  } catch (error) {
    console.error("Error checking section type:", error);
    return NextResponse.json({ error: "Failed to check section type" }, { status: 500 });
  }
}