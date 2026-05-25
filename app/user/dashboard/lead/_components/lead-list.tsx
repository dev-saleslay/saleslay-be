import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LeadItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  externalId: string;
  provider: string;
  lastSyncedAt: Date;
};

type LeadListProps = {
  isAuthenticated: boolean;
  leads: LeadItem[];
};

export function LeadList({ isAuthenticated, leads }: LeadListProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>All leads</CardTitle>
      </CardHeader>
      <CardContent>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">Please sign in to view your leads.</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leads found. Connect CRM Integration and sync leads.
          </p>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const fullName = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim();
              return (
                <div key={lead.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="font-semibold">{fullName || "Unknown"}</p>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                      {lead.provider.toLowerCase()}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>Email: {lead.email || "N/A"}</p>
                    <p>Phone: {lead.phone || "N/A"}</p>
                    <p>Company: {lead.company || "N/A"}</p>
                    <p>External ID: {lead.externalId}</p>
                    <p className="sm:col-span-2">
                      Last synced: {new Date(lead.lastSyncedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
