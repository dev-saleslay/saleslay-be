import Link from "next/link";

export function FooterSection() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-12 md:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="text-sm font-semibold tracking-tight text-foreground">SalesLay</p>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="transition hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/contact" className="transition hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          © {year} SalesLay. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
