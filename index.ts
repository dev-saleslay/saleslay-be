import express from "express";
import cors from "cors";
import { connectionRouter } from "./routes/connection";
import { crmRouter } from "./routes/crm";
import { cronRouter } from "./routes/cron";
import { messagingRouter } from "./routes/messaging";
import { settingsRouter } from "./routes/settings";
import { userRouter } from "./routes/user";
import { webhooksRouter } from "./routes/webhooks";
import { workflowRouter } from "./routes/workflow";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/connection", connectionRouter);
app.use("/api/crm", crmRouter);
app.use("/api/cron", cronRouter);
app.use("/api/messaging", messagingRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/user", userRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/workflow", workflowRouter);

// Legacy aliases
app.use("/api/integrations/status", (req, res, next) => {
  req.url = "/status";
  connectionRouter(req, res, next);
});
app.use("/api/hubspot", crmRouter); // deprecated: use /api/crm/hubspot
app.use("/api/leads", (req, res, next) => {
  req.url = "/leads" + req.url;
  crmRouter(req, res, next);
}); // deprecated: use /api/crm/leads

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
