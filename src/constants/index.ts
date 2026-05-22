import { LayoutDashboard, Tags, Users, Wallet, Calendar } from "lucide-react";
import type { MenuItem } from "#/types";

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
	{
		title: "Transactions",
		url: "/transactions",
		icon: Wallet,
	},
  {
    title: "Categories",
    url: "/categories",
    icon: Tags,
  },
  {
    title: "Budgets",
    url: "/budgets",
    icon: Calendar,
  },
];
