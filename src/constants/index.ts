import {
	Calendar,
	ChartPie,
	CreditCard,
	HandCoins,
	Landmark,
	LayoutDashboard,
	RefreshCw,
	Tags,
	TrendingUp,
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
		title: "Accounts",
		url: "/accounts",
		icon: Landmark,
	},
	{
		title: "Credit Cards",
		url: "/credit-cards",
		icon: CreditCard,
	},
	{
		title: "Investments",
		url: "/investments",
		icon: ChartPie,
	},
	{
		title: "Loans & EMIs",
		url: "/loans",
		icon: HandCoins,
	},
	{
		title: "Recurring",
		url: "/recurring",
		icon: RefreshCw,
	},
	{
		title: "Analytics",
		url: "/analytics",
		icon: TrendingUp,
	},
];
