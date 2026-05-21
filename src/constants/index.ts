import type { MenuItem } from "#/types";
import { LayoutDashboard, Users } from "lucide-react";

export const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Users,
  },
];
