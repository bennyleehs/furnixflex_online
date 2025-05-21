// src/types/sidebarMenu.ts
export interface MenuItem {
  label: string;
  route: string;
  id?: string;
  children?: MenuItem[];
}

export interface MenuSection {
  name: string;
  menuItems: MenuItem[];
}

// Interface for menu items with path information
export interface MenuWithPath {
  label: string;
  id: string;
  path: string;
  section: string;
}

export type SidebarMenu = MenuSection[];
