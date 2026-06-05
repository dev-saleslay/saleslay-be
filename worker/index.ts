import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/queue/redis";
import { handleInboundSmsFromPossibleLead } from "../lib/lead-ai/inbound-sms-reply";
import { handleInboundEmailFromPossibleLead } from "../lib/lead-ai/inbound-email-reply";
import { reconcileInboundEmailsGlobal } from "../lib/lead-ai/reconcile-inbound";
import { runWorkflowTemplateStep } from "../lib/workflow/workflow-template-send";
import { prisma } from "../lib/prisma";

console.log("🚀 SalesLay Worker Daemon Starting up...");

// 1. Inbound SMS Worker
const smsWorker = new Worker(
  "inbound-sms",
  async (job: Job) => {
    const { userId, fromRaw, body, messageSid } = job.data;
    console.log(`[SMS-Worker] Processing job ${job.id} for user ${userId}, from: ${fromRaw}`);
    try {
      await handleInboundSmsFromPossibleLead({
        userId,
        fromRaw,
        body,
        messageSid,
      });
      console.log(`[SMS-Worker] Successfully completed job ${job.id}`);
    } catch (error) {
      console.error(`[SMS-Worker] Error in job ${job.id}:`, error);
      throw error;
    }
  },
  { connection: redisConnection as any, concurrency: 5 }
);

// 2. Inbound Email Worker
const emailWorker = new Worker(
  "inbound-email",
  async (job: Job) => {
    const { userId, fromHeader, subject, textBody, emailMessageId } = job.data;
    console.log(`[Email-Worker] Processing job ${job.id} for user ${userId}, from: ${fromHeader}`);
    try {
      await handleInboundEmailFromPossibleLead({
        userId,
        fromHeader,
        subject,
        textBody,
        emailMessageId,
      });
      console.log(`[Email-Worker] Successfully completed job ${job.id}`);
    } catch (error) {
      console.error(`[Email-Worker] Error in job ${job.id}:`, error);
      try {
        await prisma.emailMessage.update({
          where: { id: emailMessageId },
          data: { inboundLeadHookAt: null },
        });
      } catch (dbErr) {
        console.error(`[Email-Worker] Failed to reset email hook status:`, dbErr);
      }
      throw error;
    }
  },
  { connection: redisConnection as any, concurrency: 5 }
);

// 3. Cron Reconcile Worker
const cronWorker = new Worker(
  "cron-reconcile",
  async (job: Job) => {
    console.log(`[Cron-Worker] Running inbound email reconciliation job ${job.id}`);
    try {
      const result = await reconcileInboundEmailsGlobal();
      console.log(`[Cron-Worker] Completed. Result:`, result);
    } catch (error) {
      console.error(`[Cron-Worker] Error:`, error);
      throw error;
    }
  },
  { connection: redisConnection as any, concurrency: 1 }
);

// 4. Workflow automation Worker (playbook/sequence automation)
const workflowWorker = new Worker(
  "workflow",
  async (job: Job) => {
    const { userId, step, uniqueIds, ready, savedTemplateId } = job.data;
    console.log(`[Workflow-Worker] Executing step ${step} playbook for user ${userId}, leads: ${uniqueIds.length}`);
    try {
      const { results, templateStepCount } = await runWorkflowTemplateStep(userId, step, uniqueIds, ready);
      console.log(`[Workflow-Worker] Execution complete. Results count: ${results.length}, total steps: ${templateStepCount}`);

      // Perform the secondary tracking / database persistence steps
      const templateStep0 = ready.steps[0];
      if (step === 1 && templateStepCount >= 2 && templateStep0) {
        for (const r of results) {
          const isComplete = r.email.ok && (!templateStep0.delivery.sms || (r.sms && r.sms.ok));
          if (isComplete) {
            const existing = await prisma.workflowLeadProgress.findFirst({
              where: { userId, crmLeadId: r.leadId },
            });
            const label = ready.categoryTitle.slice(0, 500);
            if (existing) {
              await prisma.workflowLeadProgress.update({
                where: { id: existing.id },
                data: { savedTemplateId, templateLabel: label },
              });
            } else {
              await prisma.workflowLeadProgress.create({
                data: {
                  userId,
                  crmLeadId: r.leadId,
                  savedTemplateId,
                  templateLabel: label,
                },
              });
            }
          } else {
            await prisma.workflowLeadProgress.deleteMany({
              where: { userId, crmLeadId: r.leadId },
            });
          }
        }
      }

      if (step === 2) {
        await prisma.workflowLeadProgress.deleteMany({
          where: { userId, crmLeadId: { in: uniqueIds } },
        });
      }
    } catch (error) {
      console.error(`[Workflow-Worker] Error processing job ${job.id}:`, error);
      throw error;
    }
  },
  { connection: redisConnection as any, concurrency: 2 }
);

// Handle global worker events
const workers = [smsWorker, emailWorker, cronWorker, workflowWorker];

for (const worker of workers) {
  worker.on("failed", (job, err) => {
    console.error(`❌ Worker ${worker.name} job ${job?.id} failed:`, err);
  });
  worker.on("error", (err) => {
    console.error(`⚠️ Worker ${worker.name} encountered error:`, err);
  });
}

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();
  console.log("Workers closed successfully.");
  process.exit(0);
});
