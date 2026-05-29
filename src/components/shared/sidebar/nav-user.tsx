import { Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "#/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import useCurrentUser from "#/hooks/use-current-user";
import { getInitials } from "#/lib/utils";
import AccountDialog from "./account-dialog";

export function NavUser() {
	const [accountOpen, setAccountOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const { state, isMobile } = useSidebar();
	const currentUser = useCurrentUser();

	if (!currentUser) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem className="group/sidebar-user">
				<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
					<DropdownMenuTrigger
						render={(props) => (
							<SidebarMenuButton
								{...props}
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[state=collapsed]:hover:bg-sidebar cursor-pointer border-t border-border/50"
							>
								<Tooltip>
									<TooltipTrigger
										render={(props) => (
											<Avatar
												className="h-8 w-8 rounded-full group-data-[state=collapsed]:hover:border-3 group-data-[state=collapsed]:hover:border-primary"
												{...props}
											>
												<AvatarImage
													src={currentUser.image || ""}
													alt={currentUser.name}
												/>
												<AvatarFallback>
													{getInitials(currentUser.name)}
												</AvatarFallback>
											</Avatar>
										)}
									/>
									<TooltipContent
										align="start"
										side="right"
										sideOffset={4}
										alignOffset={4}
										hidden={state !== "collapsed" || isMobile || dropdownOpen}
									>
										{currentUser.name}
									</TooltipContent>
								</Tooltip>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">
										{currentUser.name}
									</span>
									<span className="truncate text-xs text-muted-foreground group-hover/sidebar-user:text-primary-foreground">
										{currentUser.email}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto size-4" />
							</SidebarMenuButton>
						)}
					/>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-none p-1"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="h-8 w-8 rounded-none">
										<AvatarImage
											src={currentUser.image || ""}
											alt={currentUser.name}
										/>
										<AvatarFallback>
											{getInitials(currentUser.name)}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">
											{currentUser.name}
										</span>
										<span className="truncate lowercase text-xs text-muted-foreground">
											{currentUser.email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								className="cursor-pointer rounded-none"
								onClick={() => {
									setAccountOpen(true);
									setDropdownOpen(false);
								}}
							>
								<BadgeCheck className="mr-2 h-4 w-4" />
								Account
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							nativeButton={false}
							render={(params) => (
								<Button
									nativeButton={false}
									{...params}
									variant="destructive"
									className="w-full justify-start cursor-pointer rounded-none h-9"
									render={(props) => (
										<Link {...props} to="/auth/sign-out">
											Sign out
										</Link>
									)}
								/>
							)}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
			<AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
		</SidebarMenu>
	);
}
