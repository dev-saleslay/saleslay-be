import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { navbarConfig } from "@/config/navbar.config";
import { UserProfileMenu } from "@/components/main/user-profile-menu";

export async function Navbar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="w-full border-b bg-background">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href={navbarConfig.logo.href} className="text-lg font-semibold">
          {navbarConfig.logo.label}
        </Link>

        <div className="flex items-center gap-6">
          {navbarConfig.links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {session?.user ? (
            <UserProfileMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
            />
          ) : (
            <Link
              href={navbarConfig.login.href}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {navbarConfig.login.label}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
