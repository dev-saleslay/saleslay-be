import { Queue } from "bullmq";
import { redisConnection } from "./redis";

// Define Queues
export const inboundSmsQueue = new Queue("inbound-sms", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const inboundEmailQueue = new Queue("inbound-email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const cronReconcileQueue = new Queue("cron-reconcile", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const workflowQueue = new Queue("workflow", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

// Enqueue SMS job
export async function enqueueInboundSms(data: {
  userId: string;
  fromRaw: string;
  body: string | null;
  messageSid: string;
}) {
  await inboundSmsQueue.add("process-sms", data);
}

// Enqueue Email job
export async function enqueueInboundEmail(data: {
  userId: string;
  fromHeader: string;
  subject: string | null;
  textBody: string | null;
  emailMessageId: string;
}) {
  await inboundEmailQueue.add("process-email", data);
}

// Enqueue Reconcile job
export async function enqueueReconcileInbound() {
  await cronReconcileQueue.add("process-reconcile", {});
}

// Enqueue Workflow step job
export async function enqueueWorkflowStep(data: {
  userId: string;
  step: 1 | 2;
  uniqueIds: string[];
  ready: any;
  savedTemplateId: string;
}) {
  await workflowQueue.add("process-workflow-step", data);
}
