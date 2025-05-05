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
  
  export type SidebarMenu = MenuSection[];