import { WorkflowPageClient } from "@/app/user/dashboard/workflow/_components/workflow-page-client";

export default function WorkflowPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Workflow</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Choose a playbook from My templates, pick contacts, then run. Placeholders like first name come from the CRM.
          Extra steps go out after a short wait; open In progress to see who is still waiting. When someone replies, they
          leave that wait list.
        </p>
      </section>

      <WorkflowPageClient />
    </div>
  );
}
