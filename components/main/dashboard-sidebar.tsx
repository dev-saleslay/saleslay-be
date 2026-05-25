"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Building2,
  Cable,
  Gem,
  LogOut,
  LayoutDashboard,
  LayoutTemplate,
  Target,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { dashboardSidebarConfig } from "@/config/dashboard-sidebar.config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const itemIconMap: Record<
  (typeof dashboardSidebarConfig.items)[number]["icon"],
  LucideIcon
> = {
  dashboard: LayoutDashboard,
  lead: Target,
  templates: LayoutTemplate,
  workflow: Workflow,
  connection: Cable,
  company: Building2,
  profile: UserRound,
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const { data: session, status } = useSession();
  const userName = session?.user?.name?.trim() || "";
  const userEmail = session?.user?.email?.trim() || "";
  const fallbackInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Sidebar collapsible="icon" className="border-r bg-white dark:bg-slate-950">
      <SidebarHeader className="gap-4 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gem className="size-5" />
          </div>
          <p className="text-base font-semibold tracking-tight text-slate-600 group-data-[collapsible=icon]:hidden dark:text-slate-200">
            SalesLay
          </p>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup className="pt-3">
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardSidebarConfig.items.map((item) => {
                const Icon = itemIconMap[item.icon];
                const normalizedHref =
                  item.href.length > 1 && item.href.endsWith("/")
                    ? item.href.slice(0, -1)
                    : item.href;
                const isActive =
                  normalizedHref === "/user/dashboard"
                    ? normalizedPathname === normalizedHref
                    : normalizedPathname === normalizedHref ||
                      normalizedPathname.startsWith(`${normalizedHref}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={cn(
                        "h-12 rounded-lg px-3 text-[15px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                        isActive && "!bg-slate-900 !text-white hover:!bg-slate-900 dark:!bg-white/15 dark:!text-slate-100 dark:hover:!bg-white/20"
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 p-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 dark:border-slate-700/80 dark:bg-slate-900">
          <Avatar size="lg" className="rounded-full">
            <AvatarImage src={session?.user?.image || undefined} alt={userName || "User"} />
            <AvatarFallback>{fallbackInitials || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            {status === "loading" ? (
              <p className="truncate text-sm text-muted-foreground dark:text-slate-300">Loading...</p>
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {userName || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground dark:text-slate-400">
                  {userEmail || "Please sign in"}
                </p>
              </>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              aria-label="Logout"
              title="Logout"
              className="ml-auto inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 group-data-[collapsible=icon]:ml-0 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <LogOut className="size-4" />
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Log out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to log out from your account?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void signOut({ callbackUrl: "/" })}>
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
