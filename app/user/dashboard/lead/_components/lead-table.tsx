"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import { getPreviewLeadsPage } from "@/app/user/dashboard/dummy";
import { isDashboardDummyMode } from "@/config/dashboard-dummy.config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DotLoader } from "@/components/ui/dot-loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LeadRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  externalId: string;
  provider: string;
  lastSyncedAt: string;
};

type LeadResponse = {
  rows?: LeadRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
};

export function LeadTable() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDashboardDummyMode()) {
      setLoading(true);
      setError(null);
      const { rows, total, totalPages } = getPreviewLeadsPage(page, pageSize);
      setRows(rows);
      setTotal(total);
      setTotalPages(totalPages);
      setLoading(false);
      return;
    }

    const fetchLeads = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/crm/leads?page=${page}&pageSize=${pageSize}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as LeadResponse;
        if (!response.ok) {
          throw new Error(data.error || "Failed to load leads.");
        }
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        setRows([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "Failed to load leads.");
      } finally {
        setLoading(false);
      }
    };

    void fetchLeads();
  }, [page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading leads..." : `Showing ${rows.length} of ${total} leads`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="leads-page-size" className="text-sm text-muted-foreground">
            Fetch:
          </label>
          <select
            id="leads-page-size"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-8 cursor-pointer rounded-md border bg-background px-2 text-sm"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border p-4">
          <DotLoader label="Fetching leads" />
        </div>
      ) : error ? (
        <div className="rounded-lg border p-4 text-sm text-destructive">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No leads found. Connect CRM Integration and sync leads.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => {
                const fullName = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "Unknown";
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{fullName}</TableCell>
                    <TableCell>{lead.email || "N/A"}</TableCell>
                    <TableCell>{lead.phone || "N/A"}</TableCell>
                    <TableCell>{lead.company || "N/A"}</TableCell>
                    <TableCell>{lead.provider.toLowerCase()}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger
                          aria-label={`View more for ${fullName}`}
                          title="View more"
                          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="size-4" />
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{fullName}</DialogTitle>
                            <DialogDescription>Complete lead details</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-2 text-sm">
                            <p>
                              <span className="font-medium">Email:</span> {lead.email || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Phone:</span> {lead.phone || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Company:</span> {lead.company || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Provider:</span> {lead.provider.toLowerCase()}
                            </p>
                            <p>
                              <span className="font-medium">External ID:</span> {lead.externalId}
                            </p>
                            <p>
                              <span className="font-medium">Last Synced:</span>{" "}
                              {new Date(lead.lastSyncedAt).toLocaleString()}
                            </p>
                          </div>
                          <DialogFooter showCloseButton />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={loading || page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          disabled={loading || page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
