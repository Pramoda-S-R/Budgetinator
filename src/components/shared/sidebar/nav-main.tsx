import { Link, useLocation } from "@tanstack/react-router";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const { pathname } = useLocation();
  const { state, isMobile } = useSidebar();

  function highlightCurrentPath(url: string) {
    if (url === "/") {
      return pathname === "/" ? "bg-primary/30" : "";
    }

    return pathname.startsWith(url) ? "bg-primary/30" : "";
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <Tooltip>
              <TooltipTrigger
                render={(triggerProps) => (
                  <SidebarMenuButton
                    {...triggerProps}
                    className={highlightCurrentPath(item.url)}
                    render={(props) => (
                      <Link to={item.url} {...props}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  />
                )}
              />
              <TooltipContent
                align="start"
                side="right"
                sideOffset={4}
                alignOffset={4}
                hidden={state !== "collapsed" || isMobile}
              >
                {item.title}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
