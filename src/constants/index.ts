import {
	Calendar,
	ChartPie,
	CreditCard,
	LayoutDashboard,
	RefreshCw,
	Tags,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
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
	{
		title: "Investments",
		url: "/investments",
		icon: ChartPie,
	},
	{
		title: "Loans & EMIs",
		url: "/loans",
		icon: CreditCard,
	},
	{
		title: "Analytics",
		url: "/analytics",
		icon: TrendingUp,
	},
	{
		title: "Recurring",
		url: "/recurring",
		icon: RefreshCw,
	},
];
