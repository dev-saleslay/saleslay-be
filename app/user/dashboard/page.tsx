import { DashboardDummyHome } from "@/app/user/dashboard/_components/dashboard-dummy-home";
import { isDashboardDummyMode } from "@/config/dashboard-dummy.config";

export default function DashboardPage() {
  if (isDashboardDummyMode()) {
    return <DashboardDummyHome />;
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the sidebar to open leads, connections, templates, company profile, and settings.
      </p>
    </div>
  );
}
