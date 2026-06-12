import { Router } from "express";
import { reconcileInboundEmailsGlobal } from "../lib/lead-ai/reconcile-inbound";

export const cronRouter = Router();

cronRouter.get("/reconcile-inbound", async (req, res) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: "CRON_SECRET not configured." });
    return;
  }
  const auth = (req.headers.authorization ?? "").trim();
  if (auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await reconcileInboundEmailsGlobal();
  res.json({ ok: true, ...result });
});
