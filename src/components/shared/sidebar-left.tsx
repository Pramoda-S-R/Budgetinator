import { PiggyBank } from "lucide-react";
import type * as React from "react";
import { menuItems } from "#/constants";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "./sidebar/nav-main";
import { NavUser } from "./sidebar/nav-user";

export function SidebarLeft({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar className="border-r-0" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuButton
						className="text-primary disabled:opacity-100"
						disabled
					>
						<PiggyBank className="mr-2 h-4 w-4" />
						<span>Budgetinator</span>
					</SidebarMenuButton>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={menuItems} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
