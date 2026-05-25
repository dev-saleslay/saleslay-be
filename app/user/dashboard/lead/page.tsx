import { LeadTable } from "@/app/user/dashboard/lead/_components/lead-table";

export default function LeadPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete lead details synced from your connected CRM integrations.
        </p>
      </section>

      <LeadTable />
    </div>
  );
}
