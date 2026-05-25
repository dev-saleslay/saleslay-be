export type DashboardSidebarItem = {
  title: string;
  href: string;
  icon:
    | "dashboard"
    | "lead"
    | "templates"
    | "workflow"
    | "connection"
    | "company"
    | "profile";
};

export type DashboardSidebarConfig = {
  title: string;
  items: DashboardSidebarItem[];
};

export const dashboardSidebarConfig: DashboardSidebarConfig = {
  title: "User Dashboard",
  items: [
    {
      title: "Dashboard",
      href: "/user/dashboard",
      icon: "dashboard",
    },
    {
      title: "Lead",
      href: "/user/dashboard/lead",
      icon: "lead",
    },
    {
      title: "Templates",
      href: "/user/dashboard/templates",
      icon: "templates",
    },
    {
      title: "Workflow",
      href: "/user/dashboard/workflow",
      icon: "workflow",
    },
    {
      title: "Connection",
      href: "/user/dashboard/connection",
      icon: "connection",
    },
    {
      title: "My Company",
      href: "/user/dashboard/my-company",
      icon: "company",
    },
    {
      title: "Settings",
      href: "/user/dashboard/settings",
      icon: "profile",
    },
  ],
};
