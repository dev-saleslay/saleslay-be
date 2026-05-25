export type NavItem = {
  label: string;
  href: string;
};

export type NavbarConfig = {
  logo: NavItem;
  links: NavItem[];
  login: NavItem;
};

export const navbarConfig: NavbarConfig = {
  logo: {
    label: "SalesLay",
    href: "/",
  },
  links: [
    {
      label: "Pricing",
      href: "/#pricing",
    },
    {
      label: "How it works",
      href: "/#how-it-works",
    },
  ],
  login: {
    label: "Join now",
    href: "/auth/joinnow",
  },
};
