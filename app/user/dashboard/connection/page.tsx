import { Suspense } from "react";

import { ConnectionPageClient } from "@/app/user/dashboard/connection/_components/connection-page-client";
import { DotLoader } from "@/components/ui/dot-loader";

export default function ConnectionPage() {
  return (
    <div className="w-full max-w-none">
      <Suspense
        fallback={
          <div className="rounded-xl border border-border/80 bg-card p-8">
            <DotLoader label="Loading connection" />
          </div>
        }
      >
        <ConnectionPageClient />
      </Suspense>
    </div>
  );
}
