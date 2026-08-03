export interface SidebarItem {
  title: string;
  slug: string;
  group: string;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}
