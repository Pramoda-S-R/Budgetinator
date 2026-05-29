import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { SidebarLeft } from "#/components/shared/sidebar-left";
import { Separator } from "#/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { getServerSession } from "#/lib/session.functions";

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ location }) => {
		const user = await getServerSession();
		if (!user) {
			throw redirect({
				to: "/auth/sign-in",
				search: { redirectTo: location.pathname },
			});
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SidebarProvider>
			<SidebarLeft collapsible="icon" />
			<SidebarInset>
				<header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2 z-1">
					<div className="flex flex-1 items-center gap-2 px-3">
						<SidebarTrigger className="cursor-pointer" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4 mt-1"
						/>
						<Link to="/" className="group flex items-center gap-2">
							<span className="group-hover:text-primary group-hover:underline">
								Budgetinator
							</span>
						</Link>
					</div>
					<div className="flex items-center gap-2 px-3">
						{/* <ModeToggle /> */}
					</div>
				</header>
				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
